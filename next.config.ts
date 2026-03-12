import type { NextConfig } from 'next';
import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  fallbacks: {
    document: '/offline',
  },
  // Forzamos la estabilidad del Service Worker
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      {
        // 🧠 Tesseract.js: Modelo de OCR en español (20MB)
        // Estrategia CacheFirst: Se descarga una vez y se sirve desde caché para siempre.
        // Permite que el validador SIMIT funcione completamente offline.
        urlPattern: /https:\/\/cdn\.jsdelivr\.net\/npm\/tesseract\.js.*/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'tesseract-ocr-model',
          expiration: {
            maxEntries: 5,
            maxAgeSeconds: 60 * 60 * 24 * 365, // 1 año
          },
        },
      },
      {
        urlPattern: /^https:\/\/.*\/$/, // Home page
        handler: 'NetworkFirst',
        options: {
          cacheName: 'documents',
          expiration: {
            maxEntries: 10,
          },
        },
      },
      {
        urlPattern: /\/$/, // Any other route
        handler: 'NetworkFirst',
        options: {
          cacheName: 'documents',
          expiration: {
            maxEntries: 50,
          },
        },
      },
    ],
  },
});

import { securityHeadersLabels } from './src/lib/security-headers';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
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
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeadersLabels,
      },
      {
        source: '/fonts/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    optimizePackageImports: ['lucide-react', 'framer-motion', '@radix-ui/react-icons'],
  },
};

export { nextConfig };
export default withPWA(nextConfig);
