/**
 * Configuración del Sitio — Capa de Datos para Servidor
 *
 * Usa Firebase Admin SDK + cache() de React 19 para:
 * - Ejecutar las queries Firestore EN EL SERVIDOR (no en el navegador)
 * - Deduplicar peticiones dentro del mismo request
 * - Pre-renderizar los datos estáticos junto al HTML inicial
 *
 * MANDATO-FILTRO v2.4.4: Sin credenciales hardcodeadas, sin console.log en prod,
 * fallback seguro a datos por defecto si Firestore no responde.
 */

import { unstable_cache } from 'next/cache';
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

// ─── Funciones de Fetching Cacheadas (React 19 cache() + Next.js unstable_cache) ───

/**
 * Obtiene la configuración del componente Showcase (comparador de imágenes)
 * desde Firestore en el servidor. Cacheada a nivel global (ISR) para evitar latencia (TTFB).
 */
export const getShowcaseConfig = unstable_cache(
  async (): Promise<ShowcaseConfig> => {
    try {
      const adminApp = getAdminApp();
      const db = getFirestore(adminApp);
      const snap = await db.collection('site_config').doc('showcase').get();

      if (!snap.exists) {
        return SHOWCASE_DEFAULTS;
      }

      const data = snap.data() as Partial<ShowcaseConfig>;

      // Si la DB tiene URLs que apuntan a blobs viejos de vercel (que fueron purgados), forzamos las públicas
      const isBlobUrl = (url: string) => url?.includes('vercel-storage.com');

      return {
        beforeImageUrl: isBlobUrl(data.beforeImageUrl || '')
          ? SHOWCASE_DEFAULTS.beforeImageUrl
          : data.beforeImageUrl || SHOWCASE_DEFAULTS.beforeImageUrl,
        afterImageUrl: isBlobUrl(data.afterImageUrl || '')
          ? SHOWCASE_DEFAULTS.afterImageUrl
          : data.afterImageUrl || SHOWCASE_DEFAULTS.afterImageUrl,
        counterValue: data.counterValue || SHOWCASE_DEFAULTS.counterValue,
        counterLabel: data.counterLabel || SHOWCASE_DEFAULTS.counterLabel,
      };
    } catch (err) {
      // Fallo silencioso con registro auditoría: devolvemos los valores por defecto para no bloquear el renderizado
      logger.error('[site-config] Error al obtener showcase config:', { error: String(err) });
      return SHOWCASE_DEFAULTS;
    }
  },
  ['site_config_showcase'],
  { revalidate: 3600, tags: ['site_config'] }
);

/**
 * Obtiene la configuración del footer (contacto, redes sociales)
 * desde Firestore en el servidor. Cacheada a nivel global (ISR) para evitar latencia.
 */
export const getFooterConfig = unstable_cache(
  async (): Promise<FooterConfig> => {
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
  },
  ['site_config_footer'],
  { revalidate: 3600, tags: ['site_config'] }
);
