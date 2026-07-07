import { NextResponse } from 'next/server';
import { signVipSession } from '@/lib/security/vip-jwt';
import { hashPII } from '@/lib/security/server-crypto';
import { verifyOtpChallenge } from '@/lib/security/vip-otp-service';
import { rateLimit } from '@/lib/security/rate-limit';
import { logger } from '@/lib/logger/security-logger';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cedula, otp } = body as { cedula?: string; otp?: string };

    if (!cedula || !otp) {
      return NextResponse.json({ error: 'Cédula y código OTP son requeridos.' }, { status: 400 });
    }

    const normalizedCedula = cedula.trim().replace(/\D/g, '');
    const hashedCedula = hashPII(normalizedCedula);

    // Rate Limiting del OTP
    const rl = await rateLimit(`vip-otp:${hashedCedula}`, 5, 15 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Demasiados intentos de verificación. Intente más tarde.' },
        { status: 429 }
      );
    }

    const { success, hashedCelular } = await verifyOtpChallenge(hashedCedula, otp);
    if (!success || !hashedCelular) {
      logger.warn('[VIP OTP] Intento de verificación fallido o código expirado', { hashedCedula });
      return NextResponse.json(
        { error: 'Código inválido o expirado. Genera uno nuevo.' },
        { status: 401 }
      );
    }

    // 🛡️ Tras probar posesión del celular, emitimos la sesión
    const sessionToken = await signVipSession({
      hashedCedula,
      hashedCelular,
    });

    const response = NextResponse.json(
      { success: true, redirect: '/vip/dashboard' },
      { status: 200 }
    );

    response.cookies.set({
      name: '_vip_session',
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 días
    });

    return response;
  } catch (error) {
    logger.error('Error en verificación de OTP VIP', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
