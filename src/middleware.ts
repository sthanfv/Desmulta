import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cspHeader } from '@/lib/security-headers';

/**
 * Middleware de Seguridad Global - MANDATO-FILTRO v2.3.8
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

  // Content Security Policy (CSP) — MANDATO-FILTRO: Fuente única de verdad en security-headers.ts
  // Importado desde @/lib/security-headers para eliminar duplicación y divergencia entre
  // next.config.ts (build-time) y middleware (runtime). Ambos usan exactamente la misma definición.
  headers.set('Content-Security-Policy', cspHeader);

  // Prevenir que el sitio sea embebido en frames (Anti-Clickjacking)
  headers.set('X-Frame-Options', 'DENY');

  // Forzar detección de tipo de contenido (Anti-MIME Sniffing)
  headers.set('X-Content-Type-Options', 'nosniff');

  // Control de Referer para privacidad
  headers.set('Referrer-Policy', 'no-referrer-when-downgrade');

  // Permissions Policy: Limpieza absoluta (MANDATO-FILTRO)
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // COOP + CORP — Cross-Origin Isolation (relajado a cross-origin para CDNs externos y Turnstile)
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  headers.set('Cross-Origin-Resource-Policy', 'cross-origin');

  // HSTS (HTTP Strict Transport Security) - Solo en producción
  // next.config.ts lo aplica en build-time; el middleware lo refuerza en runtime.
  if (process.env.NODE_ENV === 'production') {
    headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
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
