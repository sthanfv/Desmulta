import type { NextConfig } from 'next';

// ─── Security Headers (MANDATO-FILTRO) ───────────────────────────────────────
// CSP, anti-clickjacking, HSTS, MIME sniffing prevention, Referrer, Permissions
const cspHeader = [
  "default-src 'self'",
  // Next.js requiere 'unsafe-inline'. Se agregan Googlegtagmanager y Facebook para tracking.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://connect.facebook.net",
  "style-src 'self' 'unsafe-inline'",
  // Imágenes: Se agregan dominios de tracking para beacons/pixeles.
  "img-src 'self' data: blob: https://placehold.co https://images.unsplash.com https://picsum.photos https://*.public.blob.vercel-storage.com https://firebasestorage.googleapis.com https://www.google-analytics.com https://www.facebook.com",
  // Conexiones: Firebase, Telegram, Google Analytics.
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://api.telegram.org https://www.google-analytics.com",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  // Anti-Clickjacking
  { key: 'X-Frame-Options', value: 'DENY' },
  // Anti-MIME Sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Referrer: solo enviar origen en cross-origin
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Deshabilitar features de hardware no usadas
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  // HSTS: forzar HTTPS durante 2 años (solo aplica en producción con HTTPS)
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Content Security Policy
  { key: 'Content-Security-Policy', value: cspHeader },
  // Cross-Origin isolation
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  // Evitar que el servidor revele tecnologías al atacante
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
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
        // Aplicar a todas las rutas
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
