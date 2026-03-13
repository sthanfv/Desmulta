// ─── Security Headers (MANDATO-FILTRO v2.6.3) ────────────────────────────────
// Endurecimiento de CSP y Hotfix de Producción para Tesseract y Gradientes.

const clean = (str: string) => str.replace(/\s+/g, ' ').trim();

export const cspHeader = [
  "default-src 'self'",

  clean(`
    script-src 'self' 'unsafe-inline' 'unsafe-eval'
    blob:
    https://www.googletagmanager.com
    https://connect.facebook.net
    https://challenges.cloudflare.com
    https://va.vercel-scripts.com
    https://apis.google.com
    https://cdn.jsdelivr.net
  `),

  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",

  clean(`
    img-src 'self' data: blob:
    https://*.public.blob.vercel-storage.com
    https://*.vercel-storage.com
    https://firebasestorage.googleapis.com
    https://grainy-gradients.vercel.app
  `),

  "media-src 'self'",
  "form-action 'self' https://wa.me",

  clean(`
    connect-src 'self'
    https://*.googleapis.com
    https://*.firebaseio.com
    https://tessdata.projectnaptha.com
    https://grainy-gradients.vercel.app
    https://challenges.cloudflare.com
    https://identitytoolkit.googleapis.com
    https://securetoken.googleapis.com
    https://api.telegram.org
    https://va.vercel-scripts.com
    https://*.vercel-storage.com
  `),

  clean(`
    script-src-elem 'self' 'unsafe-inline'
    https://cdn.jsdelivr.net
    https://challenges.cloudflare.com
    https://va.vercel-scripts.com
    https://www.google-analytics.com
    https://www.googletagmanager.com
  `),

  "worker-src 'self' blob: https://cdn.jsdelivr.net",
  "frame-src 'self' https://challenges.cloudflare.com https://www.facebook.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  'upgrade-insecure-requests',
].join('; ');

export const securityHeadersLabels = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'Content-Security-Policy', value: cspHeader },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];
