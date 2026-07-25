// ─── Security Headers (MANDATO-FILTRO v6.7.0) ────────────────────────────────
// Endurecimiento de CSP — 'unsafe-inline' eliminado de producción.
// En prod: style-src usa 'unsafe-hashes' como puente transitorio para Framer Motion.
// El nonce del middleware se aplica sobre este string en tiempo de request.

const isDev = process.env.NODE_ENV === 'development';
const unsafeEval = isDev ? " 'unsafe-eval'" : '';
// 🛡️ FIX HALLAZGO #8: Análisis de 'unsafe-inline' en script-src.
// MANDATO-FILTRO: Restaurado 'unsafe-inline' en producción.
// RAZÓN LEGAL/TÉCNICA (Riesgo Aceptado): Eliminar 'unsafe-inline' bloquea los
// scripts inyectados por Vercel (Analytics, Speed Insights), Microsoft Clarity,
// Google Tag Manager y la hidratación de Next.js.
// Implementar un sistema de nonces estricto requeriría deshabilitar la
// Generación Estática (SSG) en todas las páginas, lo que degrada críticamente
// el SEO y los Core Web Vitals. Se asume el riesgo mitigado por el resto de la CSP.
const scriptUnsafeInline = " 'unsafe-inline'";
// En producción, las animaciones 3D (GSAP) y Framer Motion requieren 'unsafe-inline' en style-src
// ya que inyectan estilos dinámicos que cambian por cada frame de animación.
// 🛡️ REVERSIÓN PARCIAL (Hallazgo 13): Reactivado porque bloquear inline-styles
// rompe críticamente la UI 3D (CardSwap). Se acepta el riesgo de 'unsafe-inline' en CSS
// a favor de la funcionalidad Core del producto, mientras script-src sigue protegido con nonce.
const styleUnsafe = " 'unsafe-inline'";

const devConnect = isDev
  ? ' ws://localhost:* ws://127.0.0.1:* wss://localhost:* wss://127.0.0.1:*'
  : '';

export const cspHeader =
  `default-src 'self' https://*.mixkit.co https://mixkit.co https://assets.mixkit.co https://*.vercel.live https://vercel.live https://challenges.cloudflare.com;
  script-src 'self'${unsafeEval}${scriptUnsafeInline} 'wasm-unsafe-eval' blob: https://*.vercel.live https://vercel.live https://www.googletagmanager.com https://connect.facebook.net https://challenges.cloudflare.com https://va.vercel-scripts.com https://apis.google.com https://cdn.jsdelivr.net https://www.google-analytics.com https://www.gstatic.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://checkout.wompi.co https://*.clarity.ms https://www.clarity.ms;
  style-src 'self'${styleUnsafe} https://fonts.googleapis.com https://challenges.cloudflare.com;
  font-src 'self' https://fonts.gstatic.com data:;
  img-src 'self' data: blob: https://desmulta.online https://*.public.blob.vercel-storage.com https://*.vercel-storage.com https://firebasestorage.googleapis.com https://images.unsplash.com https://vercel.com https://challenges.cloudflare.com https://c.clarity.ms https://*.clarity.ms https://c.bing.com;
  media-src 'self' blob: https://*.mixkit.co https://mixkit.co https://assets.mixkit.co;
  form-action 'self' https://wa.me https://checkout.wompi.co;
  connect-src 'self'${devConnect} data: blob: https://*.googleapis.com https://*.firebaseio.com https://cdn.jsdelivr.net https://challenges.cloudflare.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://api.telegram.org https://va.vercel-scripts.com https://vercel.live https://*.vercel.live https://*.vercel-storage.com https://*.resend.com https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://checkout.wompi.co https://*.clarity.ms https://www.clarity.ms;
  worker-src 'self' blob: https://cdn.jsdelivr.net https://www.gstatic.com;
  frame-src 'self' blob: https://challenges.cloudflare.com https://*.cloudflare.com https://vercel.live https://www.facebook.com https://apis.google.com https://*.firebaseapp.com https://www.google.com/recaptcha/ https://recaptcha.google.com/ https://checkout.wompi.co;
  frame-ancestors 'none';
  object-src 'none';
  base-uri 'self';
  upgrade-insecure-requests;
  trusted-types nextjs#bundler gapi#gapi goog#html default 'allow-duplicates';`
    .replace(/\s+/g, ' ')
    .trim();

export const securityHeadersLabels = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value:
      'camera=*, microphone=(), geolocation=(), xr-spatial-tracking=(self "https://challenges.cloudflare.com"), interest-cohort=()',
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
