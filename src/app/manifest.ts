import { MetadataRoute } from 'next';

/**
 * Web App Manifest - Desmulta v5.11.0
 *
 * MANDATO-FILTRO: UX Premium e Instalabilidad
 * 1. Configuración Standalone para iOS/Android.
 * 2. Branding consistente con el dorado de marca (#D4AF37).
 */
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
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
