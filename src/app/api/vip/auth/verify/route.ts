import { NextResponse } from 'next/server';
import { hashPII } from '@/lib/security/server-crypto';
import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger/security-logger';
import { rateLimit } from '@/lib/security/rate-limit';

export async function POST(request: Request) {
  try {
    const { getSecureIp } = await import('@/lib/security/ip-utils');
    const ip = getSecureIp(request);

    const rlResult = await rateLimit(`vip-verify:${ip}`, 5, 15 * 60 * 1000);
    if (!rlResult.success) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Intente más tarde.' },
        { status: 429 }
      );
    }

    const { cedula, celular, otp } = await request.json();

    if (!cedula || !celular || !otp) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    const normalizedCedula = cedula.trim().replace(/\D/g, '');
    const normalizedCelular = celular.trim().replace(/\D/g, '');
    const hashedCedula = hashPII(normalizedCedula);
    const hashedCelular = hashPII(normalizedCelular);

    const redis = Redis.fromEnv();
    const storedOtp = await redis.get(`vip_otp:${hashedCedula}`);

    if (!storedOtp || String(storedOtp) !== String(otp)) {
      return NextResponse.json({ error: 'Código inválido o expirado' }, { status: 401 });
    }

    await redis.del(`vip_otp:${hashedCedula}`);

    const { signVipSession } = await import('@/lib/security/vip-jwt');
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
    logger.error('Error verificando OTP VIP', { error: String(error) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
