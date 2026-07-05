/**
 * 🛡️ Módulo de Respuestas API Estandarizadas
 *
 * Propósito:
 * Eliminar la inspección de strings para determinar el tipo de error.
 * El frontend puede hacer `if (body.code === 'RATE_LIMITED')` en lugar de
 * parsear mensajes de texto — haciéndolo robusto ante cambios de redacción.
 *
 * Uso en rutas API:
 * ```ts
 * import { apiError, API_ERROR_CODES } from '@/lib/types/api-response';
 * return NextResponse.json(apiError('RATE_LIMITED', 'Demasiados intentos.'), { status: 429 });
 * ```
 *
 * Uso en el frontend:
 * ```ts
 * const body = await res.json();
 * if (body.code === 'DUPLICATE_CONSULTATION') { ... }
 * toast({ description: body.message });
 * ```
 */

/**
 * Catálogo de códigos de error estandarizados del sistema.
 * Cada código mapea a un tipo de fallo específico y no ambiguo.
 */
export const API_ERROR_CODES = {
  /** El cliente superó el límite de peticiones permitidas. */
  RATE_LIMITED: 'RATE_LIMITED',
  /** Los datos enviados no pasan la validación del schema. */
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  /** Ya existe una consulta activa para este documento. */
  DUPLICATE_CONSULTATION: 'DUPLICATE_CONSULTATION',
  /** El campo honeypot fue activado — petición de bot detectada. */
  BOT_DETECTED: 'BOT_DETECTED',
  /** El token de autenticación está ausente o es inválido. */
  AUTH_FAILED: 'AUTH_FAILED',
  /** El token de Cloudflare Turnstile fue rechazado. */
  TURNSTILE_FAILED: 'TURNSTILE_FAILED',
  /** Error inesperado en el servidor. */
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  /** El servicio está temporalmente no disponible (mantenimiento, saturación). */
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  /** El recurso solicitado no existe. */
  NOT_FOUND: 'NOT_FOUND',
  /** El payload supera el límite de tamaño permitido. */
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  /** El tipo MIME del archivo no está permitido. */
  INVALID_MIME: 'INVALID_MIME',
  /** El payload cifrado está corrupto o la clave es inválida. */
  ENCRYPTION_ERROR: 'ENCRYPTION_ERROR',
  /** El servicio OCR excedió el tiempo máximo de respuesta. */
  OCR_TIMEOUT: 'OCR_TIMEOUT',
  /** La imagen enviada no es un documento de tránsito válido. */
  INVALID_DOCUMENT: 'INVALID_DOCUMENT',
  /** No se proporcionó el header X-Desmulta-Key en el request. */
  API_KEY_MISSING: 'API_KEY_MISSING',
  /** La API Key proporcionada no existe o tiene formato inválido. */
  API_KEY_INVALID: 'API_KEY_INVALID',
  /** La API Key fue revocada por el administrador. */
  API_KEY_REVOKED: 'API_KEY_REVOKED',
  /** La API Key superó su fecha de expiración. */
  API_KEY_EXPIRED: 'API_KEY_EXPIRED',
  /** El plan de la API Key superó la quota mensual de requests. */
  API_KEY_QUOTA_EXCEEDED: 'API_KEY_QUOTA_EXCEEDED',
} as const;

/** Tipo inferido de los valores del catálogo de códigos. */
export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

/**
 * Estructura estandarizada de las respuestas de error de la API.
 * Siempre incluye `code` y `message`. Opcionalmente `details` para depuración.
 */
export interface ApiErrorBody {
  /** Código de error legible por máquina. Usar para ramificaciones en el frontend. */
  code: ApiErrorCode;
  /** Mensaje legible por humanos. Usar para mostrar al usuario final. */
  message: string;
  /** Información adicional de depuración (errores de validación, etc.). */
  details?: unknown;
}

/**
 * Construye un objeto de error estandarizado listo para ser pasado a `NextResponse.json()`.
 *
 * @param code Código de error del catálogo `API_ERROR_CODES`
 * @param message Mensaje descriptivo para el usuario final
 * @param details Información adicional opcional (ej: `error.flatten()` de Zod)
 * @returns Objeto `ApiErrorBody` listo para serializar
 *
 * @example
 * return NextResponse.json(
 *   apiError('RATE_LIMITED', 'Demasiados intentos. Espera 1 minuto.'),
 *   { status: 429 }
 * );
 */
export function apiError(code: ApiErrorCode, message: string, details?: unknown): ApiErrorBody {
  return {
    code,
    message,
    ...(details !== undefined && { details }),
  };
}
