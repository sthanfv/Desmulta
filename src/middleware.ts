import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware de Seguridad Global - MANDATO-FILTRO v5.2.0
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

  // Prevenir que el sitio sea embebido en frames (Anti-Clickjacking)
  headers.set('X-Frame-Options', 'DENY');

  // Forzar detección de tipo de contenido (Anti-MIME Sniffing)
  headers.set('X-Content-Type-Options', 'nosniff');

  // Control de Referer para privacidad
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy: Restringir acceso a hardware sensible si no se requiere
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
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (público)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|hero-bg.avif|oficina.avif|D.png).*)',
  ],
};
