import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware de Seguridad Global - MANDATO-FILTRO v5.17.0
 *
 * Responsabilidades:
 * 1. Hardening de Headers de Seguridad.
 * 2. Protección contra Clickjacking y Sniffing.
 * 3. Preparación para filtrado geográfico (Vercel Edge).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Next.js requiere este parámetro en la firma del middleware
export function middleware(_request: NextRequest) {
  const response = NextResponse.next();

  // Inyección de Headers de Seguridad Estrictos
  const headers = response.headers;

  // Content Security Policy (CSP) - MANDATO-FILTRO Estricto
  // Nota: En un entorno real, 'script-src' debería incluir hashes o nonces para Google Analytics/Gemini si se usan inline.
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.googletagmanager.com https://*.google-analytics.com https://va.vercel-scripts.com https://challenges.cloudflare.com https://connect.facebook.net;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data: https://*.googleusercontent.com https://*.googleapis.com https://i.ytimg.com https://*.vercel.app;
    font-src 'self' https://fonts.gstatic.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-src 'self' https://challenges.cloudflare.com;
    frame-ancestors 'none';
    connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.google-analytics.com https://*.googletagmanager.com https://challenges.cloudflare.com https://connect.facebook.net https://grainy-gradients.vercel.app https://va.vercel-scripts.com;
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, ' ')
    .trim();

  headers.set('Content-Security-Policy', cspHeader);

  // Prevenir que el sitio sea embebido en frames (Anti-Clickjacking)
  headers.set('X-Frame-Options', 'DENY');

  // Forzar detección de tipo de contenido (Anti-MIME Sniffing)
  headers.set('X-Content-Type-Options', 'nosniff');

  // Control de Referer para privacidad
  headers.set('Referrer-Policy', 'no-referrer-when-downgrade');

  // Permissions Policy: Limpieza absoluta (MANDATO-FILTRO)
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // HSTS (HTTP Strict Transport Security) - Solo en producción
  if (process.env.NODE_ENV === 'production') {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  return response;
}

// Matcher para interceptar todas las rutas excepto assets estáticos y APIs internas
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - assets estáticos específicos (hero-bg, oficina, icon)
     */
    '/((?!_next/static|_next/image|favicon.ico|hero-bg.avif|oficina.avif|icon.png).*)',
  ],
};
