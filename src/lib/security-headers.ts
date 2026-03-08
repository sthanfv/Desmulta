// ─── Security Headers (MANDATO-FILTRO) ───────────────────────────────────────

export const cspHeader = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://www.googletagmanager.com https://connect.facebook.net https://challenges.cloudflare.com https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://placehold.co https://picsum.photos https://*.public.blob.vercel-storage.com https://firebasestorage.googleapis.com https://www.google-analytics.com https://www.facebook.com https://*.facebook.com https://grainy-gradients.vercel.app",
  "media-src 'self'",
  "form-action 'self' https://checkout.stripe.com https://wa.me",
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://api.telegram.org https://www.google-analytics.com https://connect.facebook.net https://grainy-gradients.vercel.app https://challenges.cloudflare.com https://va.vercel-scripts.com https://*.vercel-storage.com",
  "frame-src 'self' https://challenges.cloudflare.com https://www.facebook.com https://connect.facebook.net",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "upgrade-insecure-requests",
].join('; ');

export const securityHeadersLabels = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'no-referrer-when-downgrade' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Content-Security-Policy', value: cspHeader },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];
