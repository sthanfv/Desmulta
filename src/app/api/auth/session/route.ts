import { NextRequest, NextResponse } from 'next/server';
import { removeAuthCookies } from 'next-firebase-auth-edge/lib/next/cookies';
import { logger } from '@/lib/logger/security-logger';

// [2026-09-22] FIX: se eliminó POST. Emitía la cookie __session con CUALQUIER idToken
// válido (sin OTP ni verificación de rol). La única emisión legítima es /api/auth/verify-otp.
export async function POST() {
  return NextResponse.json({ error: 'Gone' }, { status: 410 });
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
    response.cookies.delete('admin-god-mode-token');
    response.cookies.delete('operator-pin-token');
    return response;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    logger.error('[auth/session] Error al destruir sesión HttpOnly', { error: msg });
    return NextResponse.json({ error: 'No se pudo destruir la sesión.' }, { status: 500 });
  }
}
