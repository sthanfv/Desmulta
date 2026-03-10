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
  beforeImageUrl: '/hero-bg.avif',
  afterImageUrl: '/oficina.avif',
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
