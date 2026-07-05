import { NextRequest, NextResponse } from 'next/server';
import { setAuthCookies, removeAuthCookies } from 'next-firebase-auth-edge/lib/next/cookies';
import { logger } from '@/lib/logger/security-logger';

/**
 * Opciones de cookie HttpOnly para la sesión de administración.
 *
 * MANDATO-FILTRO v8.9.4 — Seguridad de Sesión:
 * - `httpOnly: true` — El token JWT es INACCESIBLE desde JavaScript (mitiga XSS).
 * - `secure: true`   — Solo se transmite por HTTPS en producción.
 * - `sameSite: 'strict'` — Bloquea CSRF por definición del atributo.
 *
 * Variables de entorno requeridas:
 * - `AUTH_COOKIE_SIGNATURE_KEY_CURRENT` — Clave de firma activa (rotar cada 90 días).
 * - `AUTH_COOKIE_SIGNATURE_KEY_PREVIOUS` — Clave anterior (evita cerrar sesión al rotar).
 */
function getAuthCookieOptions() {
  return {
    cookieName: '__session',
    cookieSignatureKeys: [
      process.env.AUTH_COOKIE_SIGNATURE_KEY_CURRENT || '',
      process.env.AUTH_COOKIE_SIGNATURE_KEY_PREVIOUS || '',
    ],
    cookieSerializeOptions: {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: 60 * 60 * 12, // 12 horas
    },
    serviceAccount: {
      projectId:
        process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
      // Normalización inline segura: no importar firebase-admin aquí para mantener el runtime compatible
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    },
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  };
}

/**
 * POST /api/auth/session
 *
 * Recibe el idToken del cliente tras el login con Firebase Auth Client SDK
 * y lo intercambia por una cookie HttpOnly firmada y segura.
 *
 * El cliente debe enviar: `Authorization: Bearer <idToken>`
 * El servidor verifica el token con Firebase Admin y setea la cookie.
 * El JWT NUNCA pasa por `document.cookie`.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken } = body as { idToken?: string };

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json({ error: 'Token de autorización requerido.' }, { status: 400 });
    }

    // Construimos un nuevo set de headers para pasarle el token a setAuthCookies
    // La librería lee: `Authorization: Bearer <token>`
    const authHeaders = new Headers(request.headers);
    authHeaders.set('Authorization', `Bearer ${idToken}`);

    // setAuthCookies verifica el idToken con Firebase Admin,
    // genera un customToken firmado, y setea la cookie HttpOnly en la respuesta.
    const response = await setAuthCookies(authHeaders, getAuthCookieOptions());

    logger.info('[auth/session] Sesión HttpOnly creada correctamente.');
    return response;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    logger.error('[auth/session] Error al crear sesión HttpOnly', { error: msg });
    return NextResponse.json({ error: 'No se pudo crear la sesión.' }, { status: 500 });
  }
}

/**
 * DELETE /api/auth/session
 *
 * Destruye la cookie HttpOnly de sesión.
 * Invocado al cerrar sesión desde el dashboard de administración.
 */
export async function DELETE(request: NextRequest) {
  try {
    const response = removeAuthCookies(request.headers, {
      cookieName: '__session',
      cookieSerializeOptions: {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        maxAge: 0,
      },
    });

    logger.info('[auth/session] Sesión HttpOnly destruida correctamente.');
    response.cookies.delete('admin-2fa-token');
    response.cookies.delete('admin-2fa-flag');
    return response;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    logger.error('[auth/session] Error al destruir sesión HttpOnly', { error: msg });
    return NextResponse.json({ error: 'No se pudo destruir la sesión.' }, { status: 500 });
  }
}
