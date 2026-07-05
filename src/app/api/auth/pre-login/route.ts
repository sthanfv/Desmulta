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
import { requireAdminSession } from '@/lib/auth/require-admin-session';
import { sendOtpToAdmin } from '@/lib/auth/otp-service';
import { SignJWT } from 'jose';
import { logger } from '@/lib/logger/security-logger';

// Forzar runtime Node.js para poder usar Firebase Admin y crypto
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken } = body as { idToken?: string };

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json({ error: 'Token de autorización requerido.' }, { status: 400 });
    }

    // 1. Validar que el token pertenece a un administrador
    const decodedToken = await requireAdminSession(idToken);
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
    const jwtSecret = process.env.GOD_MODE_JWT_SECRET;
    if (!jwtSecret) {
      logger.error('[pre-login] CRITICAL: GOD_MODE_JWT_SECRET no configurada.');
      return NextResponse.json(
        { error: 'Configuración de seguridad ausente en el servidor.' },
        { status: 500 }
      );
    }

    const secret = new TextEncoder().encode(jwtSecret);
    const tempToken = await new SignJWT({
      uid: decodedToken.uid,
      email,
      idToken, // Necesario para emitir la sesión en el paso de verificación
      purpose: 'otp-verification', // Restringe el uso de este token
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('5m')
      .sign(secret);

    logger.info('[pre-login] Pre-autenticación exitosa. OTP enviado.', { email });

    // 4. Devolver el tempToken al cliente — NO se establecen cookies
    return NextResponse.json({ requires_otp: true, temp_token: tempToken }, { status: 202 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error interno en pre-login.';
    logger.error('[pre-login] Error durante la pre-autenticación.', { error: msg });
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}
