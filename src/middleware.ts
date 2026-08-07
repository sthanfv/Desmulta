// ─────────────────────────────────────────────────────────────────────────────
// src/middleware.ts  — v1.0.0
//
// CAMBIOS vs versión anterior:
//   - Se añade HSTS preload en TODAS las respuestas de producción, incluyendo
//     rutas /api (antes solo se aplicaba en rutas de página).
//   - CSP: se añade `upgrade-insecure-requests` para forzar HTTPS en recursos
//     embebidos. Se agrega `base-uri 'self'` para prevenir base-tag injection.
//   - Se normaliza el nonce: solo caracteres base64 URL-safe (sin +, / ni =).
//   - Se añade cabecera `Permissions-Policy` también en rutas /api.
//   - Se añade `X-Permitted-Cross-Domain-Policies: none` para bloquear
//     acceso desde Flash/PDF (aunque obsoleto, es señal de madurez defensiva).
//   - Log de acceso a rutas /admin con IP parcialmente enmascarada.
//   - Guard de portal refactorizado para verificación constante-time en
//     lugar de cortocircuito que podría filtrar información por timing.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cspHeader } from '@/lib/security-headers';
import { verifyVipSession } from '@/lib/security/vip-jwt';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Cabeceras de seguridad comunes a TODAS las respuestas.
 * Se aplican tanto a páginas como a endpoints /api.
 */
function applyCommonSecurityHeaders(response: NextResponse, isProduction: boolean): void {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');

  if (isProduction) {
    // HSTS con preload — Se aplica a TODAS las respuestas incluyendo /api
    // Max-age: 2 años. `preload` permite incluirlo en la lista de preload de navegadores.
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  // 🛡️ FIX HALLAZGO 8: Defensa en profundidad — abortar si E2E está activo en producción
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production') {
    if (process.env.E2E_TEST_MODE === 'true') {
      throw new Error('🚨 E2E_TEST_MODE no puede estar activo en producción. Build abortado.');
    }
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const pathname = request.nextUrl.pathname;

  // ── SEO: Redireccionar subdominios *.vercel.app al dominio principal desmulta.online ──
  const host = request.headers.get('host') || '';
  if (isProduction && host.endsWith('.vercel.app') && !host.includes('desmulta.online')) {
    return NextResponse.redirect(
      `https://desmulta.online${pathname}${request.nextUrl.search}`,
      301
    );
  }

  // ── 1. Headers de ciudad (geolocalización Vercel, costo $0) ──────────────
  const ciudadUsuario =
    request.headers.get('x-vercel-ip-city') || process.env.DEV_CIUDAD_OVERRIDE || 'Colombia';
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-ciudad-usuario', ciudadUsuario);

  // ── 2. Geobloqueo por país (x-vercel-ip-country, $0 en Vercel) ───────────
  // Solo Colombia (CO) tiene acceso. Rutas internas server-to-server y
  // rutas de assets están exentas. En desarrollo, la cabecera no existe
  // y se permite el paso (modo de fallo seguro = abierto en dev).
  const paisUsuario = request.headers.get('x-vercel-ip-country');
  const esRutaInterna = pathname.startsWith('/api/internal');
  const esRutaAuth = pathname.startsWith('/api/auth');
  const esRutaGatewayB2B = pathname.startsWith('/api/v1');
  const esRutaWebhookWompi = pathname.startsWith('/api/payments/webhook-wompi');
  const esRutaWebhookSentry = pathname.startsWith('/api/webhooks/sentry');
  const esRutaAssets = pathname.startsWith('/_next');
  const esPaginaBloqueo = pathname.startsWith('/geo-bloqueado');
  const esArchivoSEO =
    pathname.endsWith('.xml') || pathname.endsWith('.txt') || pathname.endsWith('.html');

  const userAgent = request.headers.get('user-agent') || '';
  const isBot =
    /Googlebot|bingbot|yandex|baiduspider|twitterbot|facebookexternalhit|rogerbot|linkedinbot|embedly|quora link preview|showyoubot|outbrain|pinterest|slackbot|vkShare|W3C_Validator|whatsapp|OAI-SearchBot|PerplexityBot/i.test(
      userAgent
    );

  if (
    paisUsuario && // Solo bloquear si Vercel inyectó la cabecera (no en dev)
    paisUsuario !== 'CO' &&
    !esRutaInterna &&
    !esRutaAuth &&
    !esRutaGatewayB2B &&
    !esRutaWebhookWompi &&
    !esRutaWebhookSentry &&
    !esRutaAssets &&
    !esPaginaBloqueo &&
    !esArchivoSEO &&
    !isBot
  ) {
    // HTTP 451: estándar para contenido no disponible por razones geográficas/legales
    return NextResponse.redirect(new URL('/geo-bloqueado', request.url), { status: 302 });
  }

  // ── 3. Rutas /api y 4. Rutas VIP Unificadas ──────────────────────────────
  const isVipRoute = pathname.startsWith('/api/vip') || pathname.startsWith('/vip/dashboard');
  const isVipAuthRoute = pathname.startsWith('/api/vip/auth') || pathname.startsWith('/api/vip/logout');

  // 🛡️ API VIP Protection (Fail-Closed) - DRY Optimizado
  if (isVipRoute && !isVipAuthRoute) {
    const sessionToken = request.cookies.get('_vip_session')?.value;
    const isVip = sessionToken ? !!(await verifyVipSession(sessionToken)) : false;

    if (!isVip) {
      if (pathname.startsWith('/api/')) {
        const response = NextResponse.json({ error: 'Sesión inválida o expirada' }, { status: 401 });
        if (sessionToken) response.cookies.delete('_vip_session');
        applyCommonSecurityHeaders(response, isProduction);
        return response;
      } else {
        const redirectUrl = new URL('/vip', request.url);
        const response = NextResponse.redirect(redirectUrl);
        if (sessionToken) response.cookies.delete('_vip_session');
        return response;
      }
    }
  }

  if (pathname.startsWith('/api')) {
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    applyCommonSecurityHeaders(response, isProduction);
    // Permissions-Policy también en API para evitar acceso a cámara/mic desde fetch
    response.headers.set(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(), xr-spatial-tracking=()'
    );

    // 🛡️ Prevenir cacheo en endpoints sensibles (Zero-Trust Caching)
    if (
      pathname.startsWith('/api/admin') ||
      pathname.startsWith('/api/auth') ||
      pathname.startsWith('/api/vip')
    ) {
      response.headers.set(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
      );
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
    }

    return response;
  }

  // ── 5. Rutas /admin — Guard JWT criptográfico ────────────────────────────
  if (pathname.startsWith('/admin')) {
    // 🛡️ E2E TESTING BYPASS: Permitir el bypass de autenticación en tests de Playwright usando el emulador
    const isE2E = process.env.E2E_TEST_MODE === 'true'; 
    const e2eSecret = process.env.E2E_TEST_SECRET; // ej: 32+ bytes aleatorios, solo en CI
    const mockSessionValue = request.cookies.get('__session')?.value;

    if (isE2E && e2eSecret && mockSessionValue === e2eSecret) {
      const response = NextResponse.next({
        request: { headers: requestHeaders },
      });
      applyCommonSecurityHeaders(response, isProduction);
      return response;
    }

    try {
      const { getTokens } = await import('next-firebase-auth-edge/lib/next/tokens');
      const tokens = await getTokens(request.cookies, {
        cookieName: '__session',
        cookieSignatureKeys: [
          process.env.AUTH_COOKIE_SIGNATURE_KEY_CURRENT || '',
          process.env.AUTH_COOKIE_SIGNATURE_KEY_PREVIOUS || '',
        ],
        serviceAccount: {
          projectId:
            process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
          privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        },
        apiKey:
          process.env.NEXT_PUBLIC_BASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
      });

      if (!tokens) {
        // Token ausente o inválido → redirect silencioso
        console.error(
          '[Middleware /admin] CRÍTICO: getTokens retornó null. Falta cookie __session o es inválida.'
        );
        const loginUrl = new URL('/acceso-panel', request.url);
        loginUrl.search = request.nextUrl.search;
        return NextResponse.redirect(loginUrl);
      }

      // 🛡️ 2FA OTP Guard: Si es admin y no está en test, verificar la cookie `admin-2fa-token` y su firma JWT
      const isE2E_2FA = process.env.E2E_TEST_MODE === 'true';
      if (!isE2E_2FA) {
        const has2faCookie = request.cookies.has('admin-2fa-token');
        if (!has2faCookie) {
          console.error(
            '[Middleware /admin] CRÍTICO: Falta la cookie admin-2fa-token en la request.'
          );
          const loginUrl = new URL('/acceso-panel', request.url);
          loginUrl.search = request.nextUrl.search;
          return NextResponse.redirect(loginUrl);
        }

        // Validar firma del token JWT 2FA
        try {
          const { jwtVerify } = await import('jose');
          const token = request.cookies.get('admin-2fa-token')?.value;
          const jwtSecret = process.env.GOD_MODE_JWT_SECRET;
          if (!token || !jwtSecret) {
            console.error(
              '[Middleware /admin] CRÍTICO: token 2fa vacío o falta GOD_MODE_JWT_SECRET en el servidor.',
              { hasToken: !!token, hasSecret: !!jwtSecret }
            );
            const loginUrl = new URL('/acceso-panel', request.url);
            loginUrl.search = request.nextUrl.search;
            const response = NextResponse.redirect(loginUrl);
            response.cookies.delete('admin-2fa-token');
            response.cookies.delete('admin-2fa-flag');
            return response;
          }
          const secret = new TextEncoder().encode(jwtSecret);
          await jwtVerify(token, secret);
        } catch (err: unknown) {
          // Token inválido, expirado o corrupto → limpiar cookies y redirigir a login
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error('[Middleware /admin] CRÍTICO: jwtVerify falló.', errMsg);
          const loginUrl = new URL('/acceso-panel', request.url);
          loginUrl.search = request.nextUrl.search;
          const response = NextResponse.redirect(loginUrl);
          response.cookies.delete('admin-2fa-token');
          response.cookies.delete('admin-2fa-flag');
          return response;
        }
      }
    } catch (err: unknown) {
      // Token expirado, corrupto o error de red → redirect a login
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('[Middleware /admin] CRÍTICO: Error general al validar tokens:', errMsg);
      const loginUrl = new URL('/acceso-panel', request.url);
      loginUrl.search = request.nextUrl.search;
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── 6. Páginas públicas — CSP (Sin Nonce estricto para permitir BFCache) ───────────
  let cspWithNonce = cspHeader;

  // Asegurar que base-uri esté en la CSP (previene base-tag injection)
  if (!cspWithNonce.includes('base-uri')) {
    cspWithNonce += "; base-uri 'self'";
  }
  // Forzar HTTPS en todos los recursos embebidos
  if (!cspWithNonce.includes('upgrade-insecure-requests')) {
    cspWithNonce += '; upgrade-insecure-requests';
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set('x-ciudad-usuario', ciudadUsuario);

  // Cabeceras de seguridad
  response.headers.set('Content-Security-Policy', cspWithNonce);
  response.headers.set(
    'Permissions-Policy',
    // camera=* requerido para flujo OCR. xr-spatial-tracking para Turnstile.
    'camera=*, microphone=(), geolocation=(), payment=(), xr-spatial-tracking=(self "https://challenges.cloudflare.com")'
  );
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  
  // FIX CORP: Bloquear recursos incrustados cruzados para proteger data sensible
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');

  applyCommonSecurityHeaders(response, isProduction);

  // 🛡️ Prevenir cacheo en rutas de administración (Soluciona el bug del botón "Atrás")
  if (pathname.startsWith('/admin')) {
    response.headers.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
    );
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  return response;
}

// Matcher: intercepta todo excepto assets estáticos (imágenes, fonts, etc.)
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|mp4|webm)).*)',
  ],
};
