import type { NextConfig } from 'next';
import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  cacheStartUrl: false,
  dynamicStartUrl: false,
  workboxOptions: {
    runtimeCaching: [], // Desactivar el precaching agresivo por defecto
    exclude: [/firebase-messaging-sw\.js$/],
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
  typescript: {
    ignoreBuildErrors: false,
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
  // Headers de caché para assets estáticos
  async headers() {
    return [
      {
        source: '/fonts/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/tesseract/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
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
    outputFileTracingIncludes: {
      '/api/**/*': ['./node_modules/@sparticuz/chromium/bin/**/*'],
    },
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

export { nextConfig };
export default withPWA(nextConfig);
