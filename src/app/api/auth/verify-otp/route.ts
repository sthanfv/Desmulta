/**
 * POST /api/auth/verify-otp — Fase 2 del Flujo de Autenticación Wompi
 *
 * Recibe el tempToken (generado en /api/auth/pre-login) y el código OTP
 * ingresado por el administrador y:
 * 1. Verifica la firma y expiración del tempToken
 * 2. Confirma que el token sea exclusivamente para esta operación
 * 3. Verifica el código OTP en Firestore (expiración, intentos, hash)
 * 4. Emite ATÓMICAMENTE las cookies de sesión:
 *    - __session (Firebase Auth, HttpOnly, 12h)
 *    - admin-2fa-token (JWT 2FA, HttpOnly, 8h)
 *    - admin-2fa-flag (bandera pública, 8h)
 *
 * Este es el ÚNICO endpoint donde se establecen las cookies de sesión.
 * No existe sesión activa hasta que el OTP es verificado en este paso.
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';
import { setAuthCookies } from 'next-firebase-auth-edge/lib/next/cookies';
import { verifyOtpCode } from '@/lib/auth/otp-service';
import { logger } from '@/lib/logger/security-logger';

// Forzar runtime Node.js para Firebase Admin y crypto
export const runtime = 'nodejs';

/**
 * Opciones de la cookie de sesión HttpOnly de Firebase Auth.
 * Idénticas a las de /api/auth/session para mantener consistencia.
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
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    },
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { temp_token, code } = body as { temp_token?: string; code?: string };

    if (!temp_token || !code) {
      return NextResponse.json(
        { error: 'El token temporal y el código son requeridos.' },
        { status: 400 }
      );
    }

    // 1. Verificar la firma y expiración del tempToken
    const jwtSecret = process.env.GOD_MODE_JWT_SECRET;
    if (!jwtSecret) {
      logger.error('[verify-otp] CRITICAL: GOD_MODE_JWT_SECRET no configurada.');
      return NextResponse.json(
        { error: 'Configuración de seguridad ausente en el servidor.' },
        { status: 500 }
      );
    }

    const secret = new TextEncoder().encode(jwtSecret);
    let payload: { uid: string; email: string; idToken: string; purpose: string };

    try {
      const { payload: decoded } = await jwtVerify(temp_token, secret);
      payload = decoded as typeof payload;
    } catch {
      // Token inválido, expirado o corrupto
      return NextResponse.json(
        { error: 'Token temporal inválido o expirado. Inicia sesión nuevamente.' },
        { status: 401 }
      );
    }

    // 2. Verificar que el token sea exclusivo para verificación de OTP
    if (payload.purpose !== 'otp-verification') {
      logger.security('[verify-otp] Intento de uso de token con propósito no autorizado.', {
        uid: payload.uid,
        purpose: payload.purpose,
      });
      return NextResponse.json(
        { error: 'Token no autorizado para esta operación.' },
        { status: 403 }
      );
    }

    // 3. Verificar el código OTP en Firestore
    const otpResult = await verifyOtpCode(payload.uid, code);
    if (!otpResult.success) {
      return NextResponse.json({ error: otpResult.error }, { status: 401 });
    }

    // 4. Emitir la cookie de sesión Firebase (__session) usando el idToken del tempToken
    const authHeaders = new Headers(request.headers);
    authHeaders.set('Authorization', `Bearer ${payload.idToken}`);
    const sessionResponse = await setAuthCookies(authHeaders, getAuthCookieOptions());

    // Helper interno para parsear cabeceras 'Set-Cookie' a opciones de Next.js
    const parseSetCookie = (cookieStr: string) => {
      const parts = cookieStr.split(';');
      const [nameValuePair] = parts;
      const equalSignIndex = nameValuePair.indexOf('=');
      if (equalSignIndex === -1) return null;
      const name = nameValuePair.slice(0, equalSignIndex).trim();
      const value = nameValuePair.slice(equalSignIndex + 1).trim();

      const options: {
        path?: string;
        domain?: string;
        maxAge?: number;
        sameSite?: 'lax' | 'strict' | 'none' | boolean;
        expires?: Date;
        httpOnly?: boolean;
        secure?: boolean;
      } = {};

      for (let i = 1; i < parts.length; i++) {
        const part = parts[i].trim();
        if (!part) continue;
        const eqIdx = part.indexOf('=');
        if (eqIdx === -1) {
          const key = part.toLowerCase();
          if (key === 'httponly') options.httpOnly = true;
          if (key === 'secure') options.secure = true;
        } else {
          const key = part.slice(0, eqIdx).trim().toLowerCase();
          const val = part.slice(eqIdx + 1).trim();
          if (key === 'path') options.path = val;
          if (key === 'domain') options.domain = val;
          if (key === 'max-age') options.maxAge = parseInt(val, 10);
          if (key === 'samesite') {
            const lowerVal = val.toLowerCase();
            if (lowerVal === 'lax' || lowerVal === 'strict' || lowerVal === 'none') {
              options.sameSite = lowerVal;
            } else {
              options.sameSite = lowerVal === 'true';
            }
          }
          if (key === 'expires') options.expires = new Date(val);
        }
      }
      return { name, value, options };
    };

    // 5. Construir la respuesta final y copiar las cookies de Firebase
    const finalResponse = NextResponse.json({ success: true }, { status: 200 });

    // Recuperamos los Set-Cookie en bruto directamente de los headers porque next-firebase-auth-edge
    // los define directamente como headers crudos y no en el map de cookies.
    const sessionCookies =
      sessionResponse.headers.getSetCookie?.() ??
      (sessionResponse.headers.get('set-cookie')
        ? [sessionResponse.headers.get('set-cookie')!]
        : []);

    let copiedCount = 0;
    sessionCookies.forEach((cookieStr) => {
      const parsed = parseSetCookie(cookieStr);
      if (parsed) {
        finalResponse.cookies.set(parsed.name, parsed.value, parsed.options);
        copiedCount++;
      }
    });

    // Verificación diagnóstica: si no se copiaron cookies, notificamos el error crítico
    if (copiedCount === 0) {
      logger.error(
        '[verify-otp] CRÍTICO: setAuthCookies no generó ninguna cookie de sesión. El middleware rechazará el acceso.'
      );
    } else {
      logger.info(
        `[verify-otp] Cookies de sesión Firebase copiadas correctamente. count: ${copiedCount}`
      );
    }

    // 6. Firmar y añadir el token JWT de 2FA (8 horas)
    const token2fa = await new SignJWT({ uid: payload.uid, role: 'admin', auth2fa: true })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('8h')
      .sign(secret);

    finalResponse.cookies.set('admin-2fa-token', token2fa, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/admin',
      maxAge: 8 * 60 * 60,
    });

    // Cookie de bandera pública (no HttpOnly) para que el cliente detecte el estado
    finalResponse.cookies.set('admin-2fa-flag', 'true', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 8 * 60 * 60,
    });

    // 7. Registrar evento en la auditoría forense
    const { logAdminAction } = await import('@/app/admin/audit-actions');
    await logAdminAction({
      adminEmail: payload.email,
      action: 'ACCESS',
      resource: 'Admin2FA',
      details: { uid: payload.uid, type: 'VERIFY_2FA_OTP_SUCCESS_WOMPI_FLOW' },
    });

    logger.info('[verify-otp] Sesión 2FA establecida atómicamente (flujo Wompi).', {
      email: payload.email,
    });

    return finalResponse;
  } catch (error: unknown) {
    // 🛡️ FIX HALLAZGO #9: Registrar error internamente, nunca exponer detalles al cliente.
    const msg = error instanceof Error ? error.message : 'Error interno en verify-otp.';
    logger.error('[verify-otp] Error durante la verificación OTP.', { error: msg });
    return NextResponse.json(
      { error: 'Error interno al verificar el código. Intenta nuevamente.' },
      { status: 500 }
    );
  }
}
