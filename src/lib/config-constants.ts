/**
 * Configuración del Sitio — Constantes y Tipos Neutros
 *
 * Este archivo NO contiene dependencias de Node.js o Firebase Admin.
 * Es seguro importarlo tanto en componentes de CLIENTE como de SERVIDOR.
 */

// ─── Tipos de Datos ───────────────────────────────────────────────────────────

export interface ShowcaseConfig {
  beforeImageUrl: string;
  afterImageUrl: string;
  counterValue: string;
  counterLabel: string;
}

export interface FooterConfig {
  whatsapp: string;
  email: string;
  address: string;
  instagramUrl: string;
  facebookUrl: string;
}

// ─── Valores por defecto (fallback seguro) ────────────────────────────────────

export const SHOWCASE_DEFAULTS: ShowcaseConfig = {
  beforeImageUrl: '/casos-exito/caso-01-antes.webp',
  afterImageUrl: '/casos-exito/caso-01-despues.webp',
  counterValue: '1800+',
  counterLabel: 'Casos Gestionados',
};

export const FOOTER_DEFAULTS: FooterConfig = {
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '573005648309',
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'contactodesmulta@protonmail.com',
  address: 'Colombia — Servicio Nacional',
  instagramUrl: 'https://instagram.com/desmulta_co',
  facebookUrl: 'https://facebook.com/desmulta',
};

// ─── Heurísticas Legales (OCR) ────────────────────────────────────────────────
export const UMBRAL_CONFIANZA_OCR = 45;

// ─── Financiero ───────────────────────────────────────────────────────────────

/**
 * Tasa de Usura / Interés Moratorio Efectiva Anual (EA) vigente.
 * Fuente: Superintendencia Financiera de Colombia — Primer semestre 2026.
 * Valor: 26.5% EA  (0.265)
 * Actualizar cada semestre según el comunicado oficial de la Superfinanciera.
 */
export const TASA_EA_VIGENTE = 0.265;

/**
 * Salario Mínimo Mensual Legal Vigente (SMMLV) 2026.
 * Fuente: Decreto de incremento salarial 2025 (proyectado ~+9.4%).
 * ⚠️ Actualizar con el decreto oficial una vez publicado.
 * Valor actual: COP $1.423.500
 */
export const SMMLV_2026 = 1_423_500;

/**
 * Salario Mínimo Diario Legal Vigente (SMDLV) 2026.
 * Fórmula: SMMLV / 30 días.
 * Usado por el Código Nacional de Tránsito para denominación de multas.
 * Valor actual: COP $47.450
 */
export const SMDLV_2026 = Math.round(SMMLV_2026 / 30);

/**
 * Año de vigencia de las constantes financieras.
 * Permite validar que las constantes no están desactualizadas en runtime.
 */
export const VIGENCIA_CONSTANTES_ANIO = 2026;
