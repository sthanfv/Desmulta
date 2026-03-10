/**
 * Configuración del Sitio — Capa de Datos para Servidor
 *
 * Usa Firebase Admin SDK + cache() de React 19 para:
 * - Ejecutar las queries Firestore EN EL SERVIDOR (no en el navegador)
 * - Deduplicar peticiones dentro del mismo request
 * - Pre-renderizar los datos estáticos junto al HTML inicial
 *
 * MANDATO-FILTRO v5.8.0: Sin credenciales hardcodeadas, sin console.log en prod,
 * fallback seguro a datos por defecto si Firestore no responde.
 */

import { cache } from 'react';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger/security-logger';

import {
  ShowcaseConfig,
  FooterConfig,
  SHOWCASE_DEFAULTS,
  FOOTER_DEFAULTS,
} from './config-constants';
export type { ShowcaseConfig, FooterConfig };

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
  } catch (err) {
    // Fallo silencioso con registro auditoría: devolvemos los valores por defecto para no bloquear el renderizado
    logger.error('[site-config] Error al obtener showcase config:', { error: String(err) });
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
  } catch (err) {
    logger.error('[site-config] Error al obtener footer config:', { error: String(err) });
    return FOOTER_DEFAULTS;
  }
});
