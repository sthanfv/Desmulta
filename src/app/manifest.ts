import { MetadataRoute } from 'next';

/**
 * Web App Manifest - Desmulta v5.11.0
 *
 * MANDATO-FILTRO: UX Premium e Instalabilidad
 * 1. Configuración Standalone para iOS/Android.
 * 2. Branding consistente con el dorado de marca (#D4AF37).
 * force-static: instruye a Vercel a tratar esta ruta como asset estático,
 * resolviendo el warning de "Unable to find source file" en el build log.
 */
export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Desmulta — Saneamiento Vial',
    short_name: 'Desmulta',
    description: 'Expertos en defensa técnica de fotomultas en Colombia',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#D4AF37',
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/maskable_icon.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/maskable_icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
