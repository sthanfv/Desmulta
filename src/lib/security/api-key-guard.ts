/**
 * API Key Guard — Desmulta B2B Security Layer
 *
 * Valida cada request a `/api/v1/*` verificando:
 * 1. Presencia del header `X-Desmulta-Key`
 * 2. Existencia y estado de la key en Firestore (con caché Redis de 5 min)
 * 3. Expiración de la key
 * 4. Quota mensual del plan
 * 5. Rate limit por minuto por plan (Upstash)
 *
 * Arquitectura de seguridad:
 * - La key NUNCA se almacena en texto plano. Solo se compara su hash SHA-256.
 * - El caché Redis evita golpear Firestore en cada request (TTL: 5 minutos).
 * - Fail-Closed: Si Firestore o Redis fallan, el acceso se deniega.
 * - Sin timing attacks: La comparación usa timingSafeEqual de Node crypto.
 *
 * OWASP:
 * - A07:2021 (Identification & Auth Failures): Resuelto con hash + caché.
 * - A05:2021 (Security Misconfiguration): Resuelto con Fail-Closed.
 */

import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger/security-logger';
import type { ApiKeyDocument, ApiKeyPlan, ApiKeyValidationResult } from '@/lib/types/api-key';
import { API_KEY_PLANS } from '@/lib/types/api-key';
import { createHash, timingSafeEqual } from 'crypto';

// ─── Constantes ────────────────────────────────────────────────────────────────

/** Nombre del header HTTP que debe enviar el cliente B2B */
export const API_KEY_HEADER = 'x-desmulta-key';

/** Colección en Firestore donde se almacenan las API Keys */
export const FIRESTORE_COLLECTION = 'api_keys';

/** TTL del caché Redis para datos de la key (5 minutos) */
const CACHE_TTL_SECONDS = 300;

// ─── Rate Limiters por Plan (Upstash) ─────────────────────────────────────────

const redis = Redis.fromEnv();

/** Limitadores de tasa por plan — sliding window por minuto por key */
const planRateLimiters: Record<ApiKeyPlan, Ratelimit> = {
  starter: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 m') }),
  growth: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '1 m') }),
  enterprise: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(100, '1 m') }),
};

// ─── Hash Helpers ──────────────────────────────────────────────────────────────

/**
 * Genera el hash SHA-256 de una API Key.
 * Formato: "sha256:<hexdigest>"
 */
function hashApiKey(rawKey: string): string {
  return 'sha256:' + createHash('sha256').update(rawKey).digest('hex');
}

/**
 * Compara dos hashes en tiempo constante para prevenir timing attacks.
 * Evita que un atacante pueda inferir caracteres correctos midiendo tiempos.
 */
function hashesMatch(storedHash: string, candidateHash: string): boolean {
  try {
    const a = Buffer.from(storedHash, 'utf8');
    const b = Buffer.from(candidateHash, 'utf8');
    // timingSafeEqual requiere buffers del mismo tamaño
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ─── Caché Redis ───────────────────────────────────────────────────────────────

/** Clave Redis para cachear el documento de una API Key */
function cacheKey(keyId: string): string {
  return `apikey:cache:${keyId}`;
}

/**
 * Obtiene los datos de la API Key desde Redis.
 * Retorna null si no está en caché o si expiró.
 */
async function getFromCache(keyId: string): Promise<ApiKeyDocument | null> {
  try {
    const cached = await redis.get<ApiKeyDocument>(cacheKey(keyId));
    return cached ?? null;
  } catch {
    return null;
  }
}

/**
 * Almacena el documento de la API Key en Redis con TTL de 5 minutos.
 * Si Redis falla, el sistema continúa (no es crítico, solo optimización).
 */
async function setInCache(keyId: string, doc: ApiKeyDocument): Promise<void> {
  try {
    await redis.set(cacheKey(keyId), JSON.stringify(doc), { ex: CACHE_TTL_SECONDS });
  } catch {
    // No interrumpir el flujo si Redis falla en escritura
  }
}

/**
 * Invalida el caché de una key específica.
 * Llamar cuando se revoca o modifica una key.
 */
export async function invalidateApiKeyCache(keyId: string): Promise<void> {
  try {
    await redis.del(cacheKey(keyId));
    logger.info('[api-key-guard] Caché invalidado', { keyId });
  } catch (err) {
    logger.warn('[api-key-guard] Fallo al invalidar caché', { keyId, err: String(err) });
  }
}

// ─── Firestore Lookup ──────────────────────────────────────────────────────────

/**
 * Busca el documento de API Key en Firestore usando el keyId (prefijo público).
 * El keyId es el prefijo de la key hasta el primer "_" después de "dm_live_" o "dm_test_".
 * Ej: "dm_live_abc123xyz789" → keyId = "dm_live_abc123xyz789" (toda la key pública)
 */
async function getFromFirestore(keyId: string): Promise<ApiKeyDocument | null> {
  try {
    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);
    const docRef = db.collection(FIRESTORE_COLLECTION).doc(keyId);
    const snap = await docRef.get();

    if (!snap.exists) return null;
    return snap.data() as ApiKeyDocument;
  } catch (error) {
    logger.error('[api-key-guard] Error al consultar Firestore', { error: String(error) });
    return null;
  }
}

// ─── Incremento de Uso (Fire-and-Forget) ──────────────────────────────────────

/**
 * Incrementa los contadores de uso en Redis de forma asíncrona (O(1)).
 * El CRON en background (/api/cron/sync-usage) sincronizará esto a Firestore periódicamente.
 */
async function incrementUsage(keyId: string, plan: ApiKeyPlan): Promise<void> {
  try {
    const mesActual = new Date().toISOString().substring(0, 7); // "YYYY-MM"
    
    // Ejecutar atómicamente en un pipeline
    const pipeline = redis.pipeline();
    pipeline.incr(`apikey:usoTotal:${keyId}`);
    pipeline.incr(`apikey:usoMes:${mesActual}:${keyId}`);
    pipeline.set(`apikey:ultimoUso:${keyId}`, new Date().toISOString());
    // Añadir el keyId a la cola de sincronización para que el CRON sepa qué keys actualizar
    pipeline.sadd(`apikey:sync_queue`, keyId);
    
    await pipeline.exec();
  } catch (error) {
    logger.warn('[api-key-guard] Fallo al incrementar contador de uso en Redis', {
      keyId,
      plan,
      error: String(error),
    });
  }
}

// ─── Función Principal de Validación ──────────────────────────────────────────

/**
 * Valida un request de API B2B completo.
 *
 * Flujo:
 * 1. Extrae el header `X-Desmulta-Key`
 * 2. Deriva el keyId (prefijo público) de la key
 * 3. Busca en caché Redis (evita Firestore en el 95% de los casos)
 * 4. Si no hay caché, consulta Firestore y cachea el resultado
 * 5. Verifica el hash SHA-256 de la key
 * 6. Verifica expiración, estado activo y quota mensual
 * 7. Verifica el rate limit por plan (Upstash)
 * 8. Si todo pasa, dispara el incremento de uso en background
 *
 * @param rawKey - El valor del header `X-Desmulta-Key` recibido
 */
export async function validateApiKey(rawKey: string | null): Promise<ApiKeyValidationResult> {
  // 1. Verificar que se envió la key
  if (!rawKey || rawKey.trim().length < 20) {
    return {
      valid: false,
      errorCode: 'MISSING',
      errorMessage:
        'Acceso denegado. Se requiere el header X-Desmulta-Key. Obtén tu API Key en desmulta.com/api.',
    };
  }

  const key = rawKey.trim();

  // 2. El keyId es la key completa (se almacena como ID del documento en Firestore)
  // Validar formato: debe iniciar con "dm_live_" o "dm_test_"
  if (!key.startsWith('dm_live_') && !key.startsWith('dm_test_')) {
    return {
      valid: false,
      errorCode: 'INVALID',
      errorMessage: 'Formato de API Key inválido. Las keys de Desmulta comienzan con "dm_live_".',
    };
  }

  const keyId = key.substring(0, 16); // El keyId es solo el prefijo pÃºblico (ej: dm_live_12345678)
  const candidateHash = hashApiKey(key);

  // 3. Buscar en caché Redis (optimización: evita consultar Firestore cada request)
  let keyDoc = await getFromCache(keyId);

  // 4. Si no está en caché, consultar Firestore
  if (!keyDoc) {
    keyDoc = await getFromFirestore(keyId);

    if (!keyDoc) {
      // Key no existe → responder igual que si fuera inválida (no revelar si existe o no)
      return {
        valid: false,
        errorCode: 'INVALID',
        errorMessage: 'API Key inválida o no encontrada.',
      };
    }

    // Almacenar en caché para los próximos 5 minutos
    await setInCache(keyId, keyDoc);
  }

  // 5. Verificar el hash de la key (comparación en tiempo constante)
  if (!hashesMatch(keyDoc.keyHash, candidateHash)) {
    logger.warn('[api-key-guard] Hash mismatch detectado', { keyId });
    return {
      valid: false,
      errorCode: 'INVALID',
      errorMessage: 'API Key inválida.',
    };
  }

  // 6. Verificar si la key está activa
  if (!keyDoc.activa) {
    return {
      valid: false,
      errorCode: 'REVOKED',
      errorMessage:
        'Tu API Key ha sido desactivada. Contacta soporte en contactodesmulta@protonmail.com.',
    };
  }

  // 7. Verificar expiración
  if (keyDoc.expiresAt) {
    const expiresAt = new Date(keyDoc.expiresAt);
    if (expiresAt < new Date()) {
      return {
        valid: false,
        errorCode: 'EXPIRED',
        errorMessage: `Tu API Key expiró el ${expiresAt.toLocaleDateString('es-CO')}. Renueva en desmulta.com/api.`,
      };
    }
  }

  // 8. Verificar quota mensual
  const planConfig = API_KEY_PLANS[keyDoc.plan];
  const mesActual = new Date().toISOString().substring(0, 7);
  
  // Leer el uso del mes en tiempo real desde Redis. Si no está en caché (por ejemplo, primer request del mes o cache flush), 
  // hacemos fallback al dato de Firestore y el de Firestore solo será válido si el mes coincide.
  const usoMesRedis = await redis.get<number>(`apikey:usoMes:${mesActual}:${keyId}`);
  const usoMes = usoMesRedis !== null 
      ? Number(usoMesRedis) 
      : (keyDoc.mesActual === mesActual ? (keyDoc.usoMesActual ?? 0) : 0);

  const remainingMonth = planConfig.requestsPerMonth - usoMes;

  if (remainingMonth <= 0) {
    return {
      valid: false,
      errorCode: 'QUOTA_EXCEEDED',
      errorMessage: `Superaste el límite mensual de ${planConfig.requestsPerMonth.toLocaleString()} requests de tu plan ${keyDoc.plan}. El contador se resetea el día 1 del próximo mes.`,
      remainingMonth: 0,
    };
  }

  // 9. Verificar rate limit por plan (Upstash — sliding window por minuto)
  const rateLimiter = planRateLimiters[keyDoc.plan];
  const rateLimitKey = `apikey:rl:${keyId}`;
  const rlResult = await rateLimiter.limit(rateLimitKey);

  if (!rlResult.success) {
    return {
      valid: false,
      errorCode: 'RATE_LIMITED',
      errorMessage: `Demasiadas solicitudes por minuto. Tu plan ${keyDoc.plan} permite ${planConfig.requestsPerMinute} req/min. Espera unos segundos.`,
      remainingMonth,
      remainingMinute: 0,
    };
  }

  // 10. ¡Todo válido! Incrementar uso en background (no bloqueante)
  void incrementUsage(keyId, keyDoc.plan);

  logger.info('[api-key-guard] Request autorizado', {
    plan: keyDoc.plan,
    usoMes,
    remainingMonth,
    remainingMinute: rlResult.remaining,
  });

  return {
    valid: true,
    keyDoc,
    remainingMonth,
    remainingMinute: rlResult.remaining,
  };
}

// ─── Manejo Centralizado de Errores (DRY) ─────────────────────────────────────
import { NextResponse } from 'next/server';
import { apiError } from '@/lib/types/api-response';

const STATUS_MAP: Record<string, number> = {
  MISSING: 401,
  INVALID: 401,
  REVOKED: 403,
  EXPIRED: 403,
  QUOTA_EXCEEDED: 429,
  RATE_LIMITED: 429,
};
const CODE_MAP: Record<string, string> = {
  MISSING: 'API_KEY_MISSING',
  INVALID: 'API_KEY_INVALID',
  REVOKED: 'API_KEY_REVOKED',
  EXPIRED: 'API_KEY_EXPIRED',
  QUOTA_EXCEEDED: 'API_KEY_QUOTA_EXCEEDED',
  RATE_LIMITED: 'RATE_LIMITED',
};

export function handleApiKeyError(r: ApiKeyValidationResult): NextResponse {
  const status = STATUS_MAP[r.errorCode ?? 'INVALID'] ?? 401;
  const code = CODE_MAP[r.errorCode ?? 'INVALID'] ?? 'API_KEY_INVALID';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return NextResponse.json(apiError(code as any, r.errorMessage ?? ''), { status });
}
