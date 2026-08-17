// ─────────────────────────────────────────────────────────────────────────────
// src/lib/security/rate-limit.ts  — v1.1.0
//
// CAMBIOS v1.1.0 (2026-06-22 — auditoría pagos Wompi):
//   - Se añadió la cubeta `checkoutOrder` exclusiva para transacciones de pago.
//   - Antes, `create-order/route.ts` usaba la cubeta `consultation`, lo que
//     permitía que un usuario que hubiera consultado la calculadora agotara
//     su cupo de pagos sin haberlo intentado (riesgo de bloqueo cruzado).
//
// CAMBIOS v1.0.0 (2026-06-21):
//   - Integración con Upstash Redis para evitar costes de Firestore.
//   - Eliminación de condiciones de carrera mediante motor Redis Serverless.
//   - Wrapper de compatibilidad para evitar romper los endpoints clásicos.
// ─────────────────────────────────────────────────────────────────────────────

import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// 1. Inicializa la conexión con la memoria RAM Edge (Upstash)
// Redis.fromEnv() detecta automáticamente las variables UPSTASH_REDIS_...
const redis = Redis.fromEnv();

// 2. Diccionario centralizado de limitadores (Motor en memoria)
export const rateLimiters = {
  // --- A. Operaciones Públicas ---
  leads: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '15 m') }),
  ocr: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '7 d'),
    prefix: 'rl:ocr:v2', // Reiniciado a v2 a peticion de QA
  }),
  consultation: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '24 h'),
    prefix: 'rl:consultation:v5', // Cambiado a v5 para resetear limites (Ticket #88145123)
  }),
  validarOtp: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, '1 m') }),
  qr: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, '1 h') }),
  referidos: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '24 h') }),

  // --- A.1. Transacciones de Pago (cubeta EXCLUSIVA — no compartir con otras operaciones) ---
  // Límite conservador: 3 órdenes por IP por hora.
  // Razón: Una misma IP no debería necesitar crear más de 3 órdenes de pago por hora.
  // Un límite bajo protege contra ataques de creación masiva de órdenes y fraude.
  // IMPORTANTE: Esta cubeta es independiente de 'consultation' para evitar que
  // el uso de la calculadora o formularios públicos bloquee la capacidad de pago.
  checkoutOrder: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, '1 h') }),

  // --- B. Panel de Administración y Operadores ---
  galleryUpload: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '1 h') }),
  galleryDelete: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 h') }),
  godMode: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, '30 m') }),
  operatorPin: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '15 m') }),
  exportPdf: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '30 m') }),
  authorizeDownload: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 m') }),

  // --- C. Portal de Clientes VIP y Telemetría ---
  loginCedula: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '1 h') }),
  vipAuth: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '15 m') }),
  telemetry: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, '24 h') }),
  crashReport: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '1 m') }),
  escudoSimit: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(2, '1 m') }),

  // 🛡️ Cubetas adicionales para evitar bloqueo cruzado entre endpoints
  referral: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '10 m'),
    prefix: 'rl:referral',
  }),
  abandonment: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    prefix: 'rl:abandonment',
  }),
  webPushRegister: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    prefix: 'rl:webPushRegister',
  }),
  webPushRevoke: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 h'),
    prefix: 'rl:webPushRevoke',
  }),
  expedienteAction: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    prefix: 'rl:expedienteAction',
  }),
};

export type RateLimitType = keyof typeof rateLimiters;

/**
 * Función central de Rate Limiting (Fail-Closed).
 *
 * Implementa el patrón "Fail-Closed": si Upstash Redis no está disponible,
 * la función bloquea el acceso en lugar de permitirlo, priorizando la seguridad
 * sobre la disponibilidad.
 *
 * @param type - Identificador del limitador. Usar la cubeta apropiada para cada
 *   caso de uso. NO usar 'consultation' para pagos; usar 'checkoutOrder'.
 * @param identifier - IP del cliente o UID del usuario autenticado.
 * @returns Objeto con el resultado del límite: `success` indica si se permite
 *   la solicitud, `remaining` indica cuántas quedan en la ventana actual.
 */
export async function checkRateLimit(type: RateLimitType, identifier: string) {
  try {
    const limiter = rateLimiters[type];

    // Genera la clave única (ej. "ratelimit:consultation:192.168.1.5")
    const key = `ratelimit:${type}:${identifier}`;

    // Se ejecuta en ~2ms en memoria RAM, sin tocar tu base de datos
    const result = await limiter.limit(key);

    return {
      success: result.success,
      blocked: !result.success,
      limit: result.limit,
      remaining: result.remaining,
      resetTime: result.reset,
      isError: false,
    };
  } catch (error) {
    // Si Upstash cae o no está configurado (ej. desarrollo local sin .env),
    // decidimos si bloqueamos (Fail-Closed) o permitimos (Fail-Open) según la criticidad.
    const failOpenBuckets = [
      'consultation',
      'leads',
      'ocr',
      'qr',
      'referidos',
      'telemetry',
      'crashReport',
      'escudoSimit',
    ];
    const shouldFailOpen = failOpenBuckets.includes(type);

    console.error(
      `[RateLimit Error - ${type}] Fallo en verificación Upstash (Fail-Open: ${shouldFailOpen}):`,
      error
    );

    return {
      success: shouldFailOpen,
      blocked: !shouldFailOpen,
      limit: 0,
      remaining: 0,
      resetTime: Date.now(),
      isError: true,
    };
  }
}

/**
 * Puente de compatibilidad para la API clásica de rateLimit (Firestore-free)
 * Redirecciona de forma dinámica a los limitadores en memoria de Upstash.
 */
export async function rateLimit(
  identifier: string,
  limit: number,
  windowMs: number,
  collectionName: string = 'security_rate_limits'
) {
  // Mapeo dinámico de colecciones antiguas a las nuevas claves de Upstash
  let type: RateLimitType | null = null;

  if (collectionName === 'ocrRateLimits') type = 'ocr';
  else if (collectionName === 'crash_reports_cooldown') type = 'crashReport';
  else if (collectionName === 'consultationCooldowns') type = 'consultation';
  else if (collectionName === 'validar_consulta_rl') type = 'validarOtp';
  else if (collectionName === 'qrRateLimits') type = 'qr';
  else if (collectionName === 'galleryRateLimits') type = 'galleryUpload';
  else if (collectionName === 'exportPdfLimits') type = 'exportPdf';
  else if (collectionName === 'telemetryCooldowns') type = 'telemetry';
  else if (collectionName === 'referidosCooldowns') type = 'referral';
  else if (collectionName === 'web_push_register_rl') type = 'webPushRegister';
  else if (collectionName === 'web_push_revoke_rl') type = 'webPushRevoke';
  else if (collectionName === 'expediente_action_rl') type = 'expedienteAction';
  else if (collectionName === 'abandonmentRateLimits') type = 'abandonment';
  else if (collectionName === 'security_rate_limits' && identifier.startsWith('vip-auth-cedula:'))
    type = 'vipAuth';
  else if (collectionName === 'security_rate_limits' && identifier.startsWith('vip-verify:'))
    type = 'vipAuth';
  else if (collectionName === 'security_rate_limits' && identifier.startsWith('reveal-pii:'))
    type = 'godMode'; // O crear uno nuevo para reveal-pii
  else if (identifier.startsWith('god-mode-auth:')) type = 'godMode';
  else if (identifier.startsWith('operator-pin:')) type = 'operatorPin';
  else if (identifier.startsWith('estado_login_')) type = 'loginCedula';
  else if (identifier.startsWith('vip-auth:')) type = 'vipAuth';
  else if (identifier.startsWith('crash_proxy:')) type = 'crashReport';
  else if (identifier.startsWith('web-push:')) type = 'webPushRegister';

  if (!type) {
    if (collectionName === 'security_rate_limits' && !identifier.includes(':')) {
      type = 'leads'; // Fallback solo si es el por defecto simple (legacy)
    } else {
      throw new Error(
        `[rate-limit] No se encontró bucket mapeado para collectionName=${collectionName}, identifier=${identifier}. Esto es un problema de seguridad (A-3).`
      );
    }
  }

  const res = await checkRateLimit(type, identifier);
  return {
    success: res.success,
    blocked: res.blocked,
    remaining: res.remaining,
    reset: res.resetTime - Date.now(),
    totalRequests: res.limit - res.remaining,
    isError: res.isError || false,
  };
}
