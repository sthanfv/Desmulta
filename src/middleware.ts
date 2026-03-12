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
export function middleware(request: NextRequest) {
  // 1. Interceptamos la geolocalización nativa de Vercel (Costo $0)
  const vercelCity = request.headers.get('x-vercel-ip-city');
  const ciudadUsuario = vercelCity ? decodeURIComponent(vercelCity) : 'Colombia';

  // 2. Clonamos los headers de la petición entrante para inyectar la ciudad
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-ciudad-usuario', ciudadUsuario);

  // 3. Obtenemos la respuesta estándar
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // 4. Inyección de Headers de Seguridad Estrictos (MANDATO-FILTRO v2.4.5)
  const headers = response.headers;
  headers.set('Content-Security-Policy', cspHeader);
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  headers.set('Cross-Origin-Resource-Policy', 'cross-origin');

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
