/**
 * POST /api/auth/pre-login — Fase 1 del Flujo de Autenticación Wompi
 *
 * Recibe el idToken de Firebase tras el login con contraseña y:
 * 1. Valida que el usuario sea administrador
 * 2. Genera y despacha el código OTP al correo del admin
 * 3. Genera un token temporal (tempToken) de 5 minutos
 * 4. Devuelve el tempToken al cliente SIN establecer cookies de sesión
 *
 * La cookie de sesión real (__session) SOLO se establece en /api/auth/verify-otp
 * una vez que el OTP haya sido verificado correctamente.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminIdToken } from '@/lib/auth/require-admin-session';
import { sendOtpToAdmin } from '@/lib/auth/otp-service';
import { signAdminToken } from '@/lib/auth/admin-jwt';
import { logger } from '@/lib/logger/security-logger';
import { getSecureIp } from '@/lib/security/ip-utils';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Inicializar Upstash Redis y Rate-Limiter (3 peticiones por IP cada 5 minutos)
const redis = Redis.fromEnv();
const rateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '5 m'),
  analytics: true,
  prefix: '@upstash/ratelimit/admin_otp',
});

// Forzar runtime Node.js para poder usar Firebase Admin y crypto
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken } = body as { idToken?: string };

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json({ error: 'Token de autorización requerido.' }, { status: 400 });
    }

    // 0. Rate Limiting por IP
    const ip = getSecureIp(request);
    const { success, limit, remaining, reset } = await rateLimit.limit(ip);

    if (!success) {
      logger.security('[pre-login] Rate limit excedido para solicitud de OTP (Admin)', { ip });
      return NextResponse.json(
        {
          error:
            'Demasiadas solicitudes de código OTP. Por favor, intenta de nuevo en unos minutos.',
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
            'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // 1. Validar que el token pertenece a un administrador.
    // [2026-09-22] FIX: verifyAdminIdToken (sin 2FA). requireAdminSession exige un 2FA
    // previo, por lo que desde un navegador limpio el login siempre fallaba.
    const decodedToken = await verifyAdminIdToken(idToken);
    const email = decodedToken.email;

    if (!email) {
      return NextResponse.json(
        { error: 'El administrador no tiene un correo registrado.' },
        { status: 403 }
      );
    }

    // 2. Enviar el código OTP al correo del administrador
    await sendOtpToAdmin(decodedToken.uid, email);

    // 3. Generar el tempToken de vida corta (5 minutos)
    //    Incluye el idToken original para poder crear la sesión en verify-otp
    // [2026-09-22] FIX: audiencia 'otp-pending' — este token ya NO sirve como admin-2fa-token.
    const tempToken = await signAdminToken(
      'otp-pending',
      { uid: decodedToken.uid, email, idToken }, // idToken necesario para emitir la sesión
      '5m'
    );

    logger.info('[pre-login] Pre-autenticación exitosa. OTP enviado.', { email });

    // 4. Devolver el tempToken al cliente — NO se establecen cookies
    return NextResponse.json({ requires_otp: true, temp_token: tempToken }, { status: 202 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error interno en pre-login.';
    logger.error('[pre-login] Error durante la pre-autenticación.', { error: msg });
    // M-6: No devolver msg al frontend para evitar Information Leak
    return NextResponse.json({ error: 'Error de autenticación.' }, { status: 401 });
  }
}
