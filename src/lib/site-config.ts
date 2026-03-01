/**
 * Configuración del Sitio — Capa de Datos para Servidor
 *
 * Usa Firebase Admin SDK + cache() de React 19 para:
 * - Ejecutar las queries Firestore EN EL SERVIDOR (no en el navegador)
 * - Deduplicar peticiones dentro del mismo request
 * - Pre-renderizar los datos estáticos junto al HTML inicial
 *
 * MANDATO-FILTRO v5.2.0: Sin credenciales hardcodeadas, sin console.log en prod,
 * fallback seguro a datos por defecto si Firestore no responde.
 */

import { cache } from 'react';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

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

const SHOWCASE_DEFAULTS: ShowcaseConfig = {
  beforeImageUrl: '/hero-bg.avif',
  afterImageUrl: '/oficina.avif',
  counterValue: '1800+',
  counterLabel: 'Casos Gestionados',
};

const FOOTER_DEFAULTS: FooterConfig = {
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '573005648309',
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'contacto@desmulta.co',
  address: 'Colombia — Servicio Nacional',
  instagramUrl: 'https://instagram.com/desmulta_co',
  facebookUrl: 'https://facebook.com/desmulta',
};

// ─── Funciones de Fetching Cacheadas (React 19 cache()) ───────────────────────

/**
 * Obtiene la configuración del componente Showcase (comparador de imágenes)
 * desde Firestore en el servidor. Cacheada por request para deduplicación.
 */
export const getShowcaseConfig = cache(async (): Promise<ShowcaseConfig> => {
  try {
    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);
    const snap = await db.collection('site_config').doc('showcase').get();

    if (!snap.exists) {
      return SHOWCASE_DEFAULTS;
    }

    const data = snap.data() as Partial<ShowcaseConfig>;
    return {
      beforeImageUrl: data.beforeImageUrl || SHOWCASE_DEFAULTS.beforeImageUrl,
      afterImageUrl: data.afterImageUrl || SHOWCASE_DEFAULTS.afterImageUrl,
      counterValue: data.counterValue || SHOWCASE_DEFAULTS.counterValue,
      counterLabel: data.counterLabel || SHOWCASE_DEFAULTS.counterLabel,
    };
  } catch {
    // Fallo silencioso: devolvemos los valores por defecto para no bloquear el renderizado
    return SHOWCASE_DEFAULTS;
  }
});

/**
 * Obtiene la configuración del footer (contacto, redes sociales)
 * desde Firestore en el servidor. Cacheada por request para deduplicación.
 */
export const getFooterConfig = cache(async (): Promise<FooterConfig> => {
  try {
    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);
    const snap = await db.collection('site_config').doc('footer').get();

    if (!snap.exists) {
      return FOOTER_DEFAULTS;
    }

    const data = snap.data() as Partial<FooterConfig>;
    return {
      whatsapp: data.whatsapp || FOOTER_DEFAULTS.whatsapp,
      email: data.email || FOOTER_DEFAULTS.email,
      address: data.address || FOOTER_DEFAULTS.address,
      instagramUrl: data.instagramUrl || FOOTER_DEFAULTS.instagramUrl,
      facebookUrl: data.facebookUrl || FOOTER_DEFAULTS.facebookUrl,
    };
  } catch {
    return FOOTER_DEFAULTS;
  }
});
