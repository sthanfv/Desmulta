// ─────────────────────────────────────────────────────────────────────────────
// src/lib/security/rate-limit.ts  — v1.0.0
//
// CAMBIOS vs versión anterior:
//   - Fail-CLOSED: si el motor falla, se bloquea (no se abre). Esto protege
//     contra ataques que provocan excepciones deliberadas para eludir el límite.
//   - Se añade campo `blocked: boolean` a RateLimitResult para distinguir
//     "bloqueado por límite" de "permitido" sin depender solo de `success`.
//   - Se limpia el ID con regex más estricto que remueve caracteres Firestore
//     no permitidos (/, ., ~, *, [, ]).
//   - Se agrega `ttl` automático vía campo `expiresAt` para permitir cleanup con
//     reglas de TTL en Firestore (evita acumulación infinita de documentos).
//   - Se loggea la IP parcialmente anonimizada (últimos octetos enmascarados)
//     para cumplir con principios de minimización de datos.
// ─────────────────────────────────────────────────────────────────────────────

import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';
import { logger } from '@/lib/logger/security-logger';

export interface RateLimitResult {
  /** true si la petición está dentro del límite y puede continuar */
  success: boolean;
  /** true si el límite fue superado (distinct from success for clarity) */
  blocked: boolean;
  /** cuántas peticiones quedan en la ventana actual */
  remaining: number;
  /** milisegundos hasta que la ventana expire */
  reset: number;
  /** total de peticiones contadas en la ventana */
  totalRequests: number;
  /** true si falló por error de infraestructura (Firestore caído, etc) */
  isError?: boolean;
}

/**
 * Sanitiza una clave de identificación para usarla como ID de documento Firestore.
 * Remueve caracteres no permitidos: / . ~ * [ ] y espacios.
 */
function sanitizeId(identifier: string): string {
  return identifier
    .replace(/[/. ~*[\]]/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 200); // Firestore document IDs: max 1500 bytes, usamos 200 como margen seguro
}

/**
 * Anonimiza parcialmente una IP para logs (ej: "192.168.x.x").
 */
function anonymizeIp(ip: string): string {
  if (ip.includes(':')) {
    // IPv6: mostrar solo los primeros 2 segmentos
    const parts = ip.split(':');
    return parts.slice(0, 2).join(':') + ':x:x:x:x:x:x';
  }
  // IPv4: enmascarar los últimos 2 octetos
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.x.x`;
  }
  return 'unknown';
}

/**
 * Motor de Rate Limiting Persistente — Desmulta Security v1.0.0
 *
 * Implementa ventana de tiempo fija persistida en Firestore.
 * Usa transacción atómica para garantizar consistencia incluso en serverless.
 *
 * FAIL-CLOSED: Si el motor de rate-limit falla por error de infraestructura,
 * la petición es BLOQUEADA (no permitida). Esto es lo opuesto al comportamiento
 * anterior (fail-open) y es más seguro para endpoints sensibles.
 *
 * Si necesitas fail-open en un endpoint específico de baja criticidad,
 * atrapa el error en el llamador y toma la decisión allí — no aquí.
 *
 * @param identifier  Clave única (IP, UID, etc). Se sanitiza internamente.
 * @param limit        Máximo de peticiones permitidas en la ventana.
 * @param windowMs     Tamaño de la ventana en milisegundos.
 * @param collectionName Colección Firestore para el tracking.
 */
export async function rateLimit(
  identifier: string,
  limit: number,
  windowMs: number,
  collectionName: string = 'security_rate_limits'
): Promise<RateLimitResult> {
  // Validación de parámetros (evita configuraciones inválidas silenciosas)
  if (limit <= 0 || windowMs <= 0) {
    logger.error('[RATE-LIMIT] Parámetros inválidos', { limit, windowMs, identifier });
    // Parámetros inválidos: bloquear por seguridad
    return { success: false, blocked: true, remaining: 0, reset: windowMs, totalRequests: 0 };
  }

  try {
    getAdminApp();
    const db = getFirestore();
    const cleanId = sanitizeId(identifier);
    const docRef = db.collection(collectionName).doc(cleanId);
    const now = Date.now();

    return await db.runTransaction(async (transaction) => {
      const docSnap = await transaction.get(docRef);
      const data = docSnap.data();

      let windowStartMs = 0;
      if (data?.windowStart) {
        if (typeof data.windowStart === 'number') {
          windowStartMs = data.windowStart;
        } else if (typeof data.windowStart.toMillis === 'function') {
          windowStartMs = data.windowStart.toMillis();
        }
      }

      const isExpired = !docSnap.exists || now - windowStartMs > windowMs;

      if (isExpired) {
        // Nueva ventana: primer request
        const expiresAt = new Date(now + windowMs);
        transaction.set(docRef, {
          count: 1,
          windowStart: Timestamp.fromMillis(now),
          updatedAt: Timestamp.fromMillis(now),
          // Campo para futuro TTL/cleanup automático
          expiresAt,
        });
        return {
          success: true,
          blocked: false,
          remaining: limit - 1,
          reset: windowMs,
          totalRequests: 1,
        };
      }

      const currentCount = (data?.count ?? 0) + 1;
      const elapsed = now - windowStartMs;
      const reset = Math.max(0, windowMs - elapsed);

      if (currentCount > limit) {
        // No incrementar el contador si ya está bloqueado (evita overflow y ruido en logs)
        const anonId = anonymizeIp(identifier);
        logger.security(`[RATE-LIMIT] Bloqueado: ${anonId} en ${collectionName}`, {
          count: currentCount - 1, // el count real sin el intento fallido
          limit,
          resetMs: reset,
        });
        return {
          success: false,
          blocked: true,
          remaining: 0,
          reset,
          totalRequests: data?.count ?? 0,
        };
      }

      transaction.update(docRef, {
        count: currentCount,
        updatedAt: Timestamp.fromMillis(now),
      });

      return {
        success: true,
        blocked: false,
        remaining: limit - currentCount,
        reset,
        totalRequests: currentCount,
      };
    });
  } catch (error) {
    // FAIL-CLOSED: cualquier error de infraestructura bloquea la petición.
    // Esto evita que un atacante provoque excepciones deliberadas para bypasear
    // el rate-limit (p.ej. inundando Firestore para causar timeouts).
    logger.error(`[RATE-LIMIT] Fallo en motor — petición BLOQUEADA por error de infraestructura`, {
      identifier: anonymizeIp(identifier),
      collection: collectionName,
      error: String(error),
    });
    return {
      success: false,
      blocked: true,
      remaining: 0,
      reset: windowMs,
      totalRequests: 0,
      isError: true,
    };
  }
}
