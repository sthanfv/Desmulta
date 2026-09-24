import type { NextConfig } from 'next';
import withPWAInit from '@ducanh2912/next-pwa';
import withBundleAnalyzer from '@next/bundle-analyzer';
import { withSentryConfig } from '@sentry/nextjs';

const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  cacheStartUrl: false,
  dynamicStartUrl: false,
  workboxOptions: {
    runtimeCaching: [], // Desactivar el precaching agresivo por defecto
    exclude: [
      /firebase-messaging-sw\.js$/,
      /^\/admin($|\/)/,
      /^\/api\/admin($|\/)/,
      /^\/acceso-panel($|\/)/,
    ],
    // Evitar que el Service Worker intercepte estas rutas para el fallback offline
    navigateFallbackDenylist: [/^\/admin/, /^\/api/, /^\/acceso-panel/],
    additionalManifestEntries: [],
    importScripts: ['/firebase-messaging-sw.js'],
  },
  fallbacks: {
    document: '/offline', // Solo el offline fallback
  },
});

// MANDATO-FILTRO v5.4.0: Los headers de seguridad (CSP, Permissions-Policy, etc.)
// ahora viven EXCLUSIVAMENTE en src/middleware.ts.
// Esta importación fue eliminada para evitar la colisión de políticas que
// rompía Cloudflare Turnstile y el OCR en navegadores estrictos (Brave, Safari).

const nextConfig: NextConfig = {
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: false,
  },
  productionBrowserSourceMaps: false,
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? {
            exclude: ['error'], // Mantener solo los errores en producción para auditoría
          }
        : false,
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    // Reducir deviceSizes elimina variantes de imagen innecesarias en el build
    deviceSizes: [640, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Compresión gzip/brotli de respuestas (reduce JS/CSS en ~30%)
  compress: true,
  // [2026-09-24] Artículos importados con entidades HTML sin decodificar (&#39; → "39" en el slug).
  // Se renombraron a slugs limpios; la redirección 301 conserva los enlaces ya indexados.
  async redirects() {
    return [
      {
        source: '/blog/39tatequieto39-a-las-nuevas-fotomultas-en-la-via-al-mar---elheraldoco',
        destination: '/blog/tatequieto-a-las-nuevas-fotomultas-en-la-via-al-mar---elheraldoco',
        permanent: true,
      },
      {
        source:
          '/blog/frenan-instalacion-de-fotomultas-en-via-al-mar-tras-39jalon-de-orejas39-de-mintransporte',
        destination:
          '/blog/frenan-instalacion-de-fotomultas-en-via-al-mar-tras-jalon-de-orejas-de-mintransporte',
        permanent: true,
      },
    ];
  },
  // Headers de caché para assets estáticos
  async headers() {
    return [
      {
        source: '/fonts/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/tesseract/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        // Imágenes locales en /public — cachear agresivamente
        source: '/:path(.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico))',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
    ];
  },
  serverExternalPackages: ['sharp', '@sparticuz/chromium'],
  experimental: {
    // Font subsetting: elimina pesos de fuente no usados en Geist, lucide-react y framer-motion
    optimizePackageImports: ['lucide-react', 'framer-motion', '@radix-ui/react-icons', 'geist'],
  },
  outputFileTracingIncludes: {
    '/api/**/*': ['./node_modules/@sparticuz/chromium/bin/**/*'],
  },
  turbopack: {},
  async rewrites() {
    return [
      {
        source: '/multas-:ciudad',
        destination: '/servicios/:ciudad',
      },
      {
        source: '/multas-:ciudad/articulos',
        destination: '/servicios/:ciudad/articulos',
      },
    ];
  },
};

// Solo para inspección y testing. Next.js utiliza el export default (con wrapper PWA).
// Importar este export NO incluye la configuración de PWA.
export { nextConfig as nextConfigBase };
const wrappedConfig = withAnalyzer(withPWA(nextConfig));

export default withSentryConfig(wrappedConfig, {
  // Configuración base recomendada para Source Maps
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  widenClientFileUpload: true,
});
