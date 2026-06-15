// ─────────────────────────────────────────────────────────────────────────────
// src/lib/security/rate-limit.ts  — v1.0.0
//
// CAMBIOS vs versión anterior:
//   - Integración con Upstash Redis para evitar costes de Firestore.
//   - Eliminación de condiciones de carrera mediante motor Redis Serverless.
//   - Wrapper de compatibilidad para evitar romper los endpoints clásicos.
// ─────────────────────────────────────────────────────────────────────────────

import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// 1. Inicializa la conexión con la memoria RAM Edge (Upstash)
// Redis.fromEnv() detecta automáticamente las variables UPSTASH_REDIS_...
const redis = Redis.fromEnv();

// 2. Diccionario centralizado de limitadores (Motor en memoria)
export const rateLimiters = {
  // --- A. Operaciones Públicas ---
  leads: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "15 m") }),
  ocr: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, "10 m") }),
  consultation: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "5 m") }),
  validarOtp: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "1 m") }),
  qr: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, "1 m") }),

  // --- B. Panel de Administración y Operadores ---
  godMode: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, "30 m") }),
  operatorPin: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "15 m") }),
  exportPdf: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "30 m") }),

  // --- C. Portal de Clientes VIP y Telemetría ---
  loginCedula: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "1 h") }),
  vipAuth: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "15 m") }),
  telemetry: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, "24 h") }),
};

export type RateLimitType = keyof typeof rateLimiters;

/**
 * Función central de Rate Limiting (Fail-Closed)
 * @param type El identificador del limitador (ej. 'consultation', 'leads')
 * @param identifier La IP o UID del usuario
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
      isError: false
    };
  } catch (error) {
    // Fail-Closed: Si Upstash cae, bloqueamos el acceso por seguridad
    console.error(`[RateLimit Error - ${type}] Fallo en verificación Upstash:`, error);
    return { 
      success: false, 
      blocked: true, 
      limit: 0, 
      remaining: 0, 
      resetTime: Date.now(),
      isError: true
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
  let type: RateLimitType = 'leads';
  
  if (collectionName === 'ocrRateLimits') type = 'ocr';
  else if (collectionName === 'consultationCooldowns') type = 'consultation';
  else if (collectionName === 'validar_consulta_rl') type = 'validarOtp';
  else if (collectionName === 'qrRateLimits') type = 'qr';
  else if (collectionName === 'exportPdfLimits') type = 'exportPdf';
  else if (collectionName === 'telemetryCooldowns') type = 'telemetry';
  else if (collectionName === 'referidosCooldowns') type = 'leads';
  else if (collectionName === 'web_push_register_rl') type = 'vipAuth';
  else if (collectionName === 'web_push_revoke_rl') type = 'vipAuth';
  else if (collectionName === 'expediente_action_rl') type = 'operatorPin';
  else if (collectionName === 'abandonmentRateLimits') type = 'leads';
  else if (identifier.startsWith('god-mode-auth:')) type = 'godMode';
  else if (identifier.startsWith('operator-pin:')) type = 'operatorPin';
  else if (identifier.startsWith('estado_login_')) type = 'loginCedula';
  else if (identifier.startsWith('vip-auth:')) type = 'vipAuth';
  
  const res = await checkRateLimit(type, identifier);
  return {
    success: res.success,
    blocked: res.blocked,
    remaining: res.remaining,
    reset: res.resetTime - Date.now(),
    totalRequests: res.limit - res.remaining,
    isError: res.isError || false
  };
}
