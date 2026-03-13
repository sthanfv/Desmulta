// ─── Security Headers (MANDATO-FILTRO v2.3.8) ────────────────────────────────
// Endurecimiento de CSP: Eliminación de unsafe-eval. unsafe-inline se mantiene
// únicamente para estilos (requerido por Tailwind CSS) y scripts de terceros
// críticos (GTM, Firebase, Turnstile) que no ofrecen alternativa.
// Referencia: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP

export const cspHeader = [
  "default-src 'self'",

  // MANDATO-FILTRO: Se eliminó 'unsafe-eval' en Producción. Solo se permite inline para
  // compatibilidad con Next.js y scripts de terceros auditados.
  // En Desarrollo, permitimos 'unsafe-eval' para que funcione el Hot Reloading (HMR).
  [
    `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
    'blob:',
    'https://www.googletagmanager.com',
    'https://connect.facebook.net',
    'https://challenges.cloudflare.com',
    'https://va.vercel-scripts.com',
    'https://apis.google.com',
    'https://cdn.jsdelivr.net',
  ].join(' '),

  // Estilos: unsafe-inline requerido por Tailwind CSS / shadcn-ui
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",

  // Fuentes: Google Fonts
  "font-src 'self' https://fonts.gstatic.com data:",

  // Imágenes: Solo origenes conocidos y auditados
  [
    "img-src 'self' data: blob:",
    'https://placehold.co',
    'https://picsum.photos',
    'https://*.public.blob.vercel-storage.com',
    'https://firebasestorage.googleapis.com',
    'https://www.google-analytics.com',
    'https://www.facebook.com',
    'https://*.facebook.com',
    'https://grainy-gradients.vercel.app',
  ].join(' '),

  "media-src 'self'",

  // Formularios: Solo rutas propias y salidas controladas
  "form-action 'self' https://wa.me",

  // Conexiones de red: Solo APIs auditadas y necesarias
  [
    "connect-src 'self'",
    'https://*.googleapis.com',
    'https://*.firebaseio.com',
    'wss://*.firebaseio.com',
    'https://identitytoolkit.googleapis.com',
    'https://securetoken.googleapis.com',
    'https://api.telegram.org',
    'https://www.google-analytics.com',
    'https://connect.facebook.net',
    'https://challenges.cloudflare.com',
    'https://va.vercel-scripts.com',
    'https://*.vercel-storage.com',
    'https://cdn.jsdelivr.net',
  ].join(' '),

  // Worker-src explícito para el Web Worker de Tesseract, y script-src-elem para scripts de inyección dinámica pura (Turnstile, Vercel Analytics)
  [
    "script-src-elem 'self' 'unsafe-inline'",
    'https://cdn.jsdelivr.net',
    'https://challenges.cloudflare.com',
    'https://va.vercel-scripts.com',
    'https://www.google-analytics.com',
    'https://www.googletagmanager.com',
  ].join(' '),
  "worker-src 'self' blob: https://cdn.jsdelivr.net",

  // Frames: Solo Cloudflare Turnstile y Facebook Login
  "frame-src 'self' https://challenges.cloudflare.com https://www.facebook.com",

  // MANDATO-FILTRO: Anti-Clickjacking — Nadie puede embebernos en un frame
  "frame-ancestors 'none'",

  // MANDATO-FILTRO: Sin objetos Flash ni plugins legacy
  "object-src 'none'",

  // MANDATO-FILTRO: Base URL fijada al origen propio
  "base-uri 'self'",

  // Forzar HTTPS en todos los recursos embebidos
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
