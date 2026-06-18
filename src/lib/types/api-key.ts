/**
 * Tipos del Sistema de API Keys — Desmulta B2B
 *
 * Define el esquema del documento almacenado en Firestore
 * bajo la colección `api_keys/{keyId}`.
 *
 * REGLA DE SEGURIDAD: La key original NUNCA se almacena en Firestore.
 * Solo se almacena su hash SHA-256 (campo `keyHash`).
 * La key completa se entrega al cliente UNA sola vez al crear la key.
 */

// ─── Planes Disponibles ────────────────────────────────────────────────────────

export type ApiKeyPlan = 'starter' | 'growth' | 'enterprise';

/**
 * Cuotas y límites por plan.
 * Fuente única de verdad para rates y quotas.
 */
export const API_KEY_PLANS: Record<
  ApiKeyPlan,
  { requestsPerMonth: number; requestsPerMinute: number; label: string }
> = {
  starter: {
    requestsPerMonth: 500,
    requestsPerMinute: 10,
    label: 'Starter — COP $150.000/mes',
  },
  growth: {
    requestsPerMonth: 5_000,
    requestsPerMinute: 30,
    label: 'Growth — COP $450.000/mes',
  },
  enterprise: {
    requestsPerMonth: 50_000,
    requestsPerMinute: 100,
    label: 'Enterprise — Contrato anual',
  },
};

// ─── Esquema del Documento en Firestore ────────────────────────────────────────

/**
 * Documento almacenado en Firestore: `api_keys/{keyId}`
 *
 * keyId = prefijo público de la key (ej. "dm_live_abc123xyz789")
 * Este documento NO contiene la key en texto plano, solo su hash SHA-256.
 */
export interface ApiKeyDocument {
  /** ID del documento = parte pública de la key (ej. "dm_live_abc123...") */
  keyId: string;

  /**
   * Hash SHA-256 de la key completa.
   * Formato: "sha256:<hex>"
   * La key nunca se almacena en texto plano en la base de datos.
   */
  keyHash: string;

  /** Nombre del cliente o empresa titular de la key */
  nombre: string;

  /** Email de contacto del titular */
  email: string;

  /** Plan contratado — determina los límites de quota y rate */
  plan: ApiKeyPlan;

  /** Si la key está activa. false = key revocada (no genera 404, genera 403) */
  activa: boolean;

  /** Timestamp de creación */
  creadaEn: string; // ISO string

  /**
   * Timestamp de expiración.
   * null = la key no expira.
   * Si se establece, la key se bloquea automáticamente al llegar a esta fecha.
   */
  expiresAt: string | null; // ISO string o null

  /** Contador acumulado de requests en toda la vida de la key */
  usoTotal: number;

  /** Contador de requests en el mes actual (se resetea el día 1 de cada mes) */
  usoMesActual: number;

  /**
   * Mes al que pertenece `usoMesActual`.
   * Formato: "YYYY-MM" (ej. "2026-06")
   * Se usa para detectar cuándo resetear el contador mensual.
   */
  mesActual: string;

  /** Nota interna del administrador (opcional) */
  notaAdmin?: string;

  /** Último timestamp de uso registrado */
  ultimoUso?: string | null;
}

// ─── Resultado de la Validación ────────────────────────────────────────────────

/**
 * Resultado de la validación de una API Key.
 * Retornado por `validateApiKey()` en el guard.
 */
export interface ApiKeyValidationResult {
  /** Si la validación fue exitosa y se puede procesar el request */
  valid: boolean;

  /**
   * Código de error si `valid` es false.
   * - MISSING: No se envió la cabecera X-Desmulta-Key
   * - INVALID: La key no existe en Firestore
   * - REVOKED: La key existe pero fue desactivada
   * - EXPIRED: La key superó su fecha de expiración
   * - QUOTA_EXCEEDED: Superó el límite mensual del plan
   * - RATE_LIMITED: Superó el límite de requests por minuto
   */
  errorCode?:
    | 'MISSING'
    | 'INVALID'
    | 'REVOKED'
    | 'EXPIRED'
    | 'QUOTA_EXCEEDED'
    | 'RATE_LIMITED';

  /** Mensaje legible para el cliente */
  errorMessage?: string;

  /** El documento de la key (solo si valid = true) */
  keyDoc?: ApiKeyDocument;

  /** Cuántos requests quedan en el mes actual */
  remainingMonth?: number;

  /** Cuántos requests quedan en el minuto actual */
  remainingMinute?: number;
}
