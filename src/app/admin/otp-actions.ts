'use server';

/**
 * Server Actions para la Autenticación de Doble Factor (2FA OTP)
 *
 * Estas acciones delegan la lógica de OTP al servicio centralizado
 * en `@/lib/auth/otp-service` para evitar duplicación de código.
 *
 * Compatibilidad con el flujo clásico (retrocompatibilidad):
 * - `sendAdminOtp`   — Genera y envía un OTP via Server Action
 * - `verifyAdminOtp` — Verifica el OTP y establece la cookie HttpOnly
 *
 * El nuevo flujo Wompi usa:
 * - POST /api/auth/pre-login  (Fase 1)
 * - POST /api/auth/verify-otp (Fase 2 — emite cookies atómicamente)
 */

import { requireAdminSession } from '@/lib/auth/require-admin-session';
import { sendOtpToAdmin, verifyOtpCode } from '@/lib/auth/otp-service';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import { logger } from '@/lib/logger/security-logger';

/**
 * Genera y envía un código OTP al correo del administrador autenticado.
 * Delega en el servicio centralizado de OTP.
 *
 * @param idToken - Token de Firebase Auth del administrador
 */
export async function sendAdminOtp(idToken: string): Promise<{ success: boolean; error?: string }> {
  try {
    const decodedToken = await requireAdminSession(idToken);
    const email = decodedToken.email;
    if (!email) throw new Error('El administrador no tiene un correo registrado.');

    // Delegar al servicio centralizado
    await sendOtpToAdmin(decodedToken.uid, email);

    // Registrar en logs de auditoría
    const { logAdminAction } = await import('@/app/admin/audit-actions');
    await logAdminAction({
      adminEmail: email,
      action: 'ACCESS',
      resource: 'Admin2FA',
      details: { uid: decodedToken.uid, type: 'GENERATE_2FA_OTP' },
    });

    logger.info('[2FA] OTP enviado con éxito.', { email });
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error interno al enviar OTP';
    logger.error('[sendAdminOtp] Error', { error: msg });
    return { success: false, error: msg };
  }
}

/**
 * Verifica el código OTP y establece la cookie de sesión 2FA HttpOnly.
 * Delega la verificación del código al servicio centralizado.
 *
 * @param idToken - Token de Firebase Auth del administrador
 * @param code    - Código de 6 dígitos ingresado por el usuario
 */
export async function verifyAdminOtp(
  idToken: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const decodedToken = await requireAdminSession(idToken);
    const email = decodedToken.email || 'admin_desconocido@desmulta.com';

    // Delegar la verificación al servicio centralizado
    const result = await verifyOtpCode(decodedToken.uid, code);
    if (!result.success) {
      const { logAdminAction } = await import('@/app/admin/audit-actions');
      await logAdminAction({
        adminEmail: email,
        action: 'ACCESS',
        resource: 'Admin2FA',
        details: { uid: decodedToken.uid, type: 'VERIFY_2FA_OTP_FAILED', error: result.error },
      });
      return result;
    }

    // Firmar el JWT de 2FA temporal (2 horas de seguridad máxima)
    const jwtSecret = process.env.GOD_MODE_JWT_SECRET;
    if (!jwtSecret) {
      logger.error('CRITICAL: GOD_MODE_JWT_SECRET no configurada para firmas de 2FA.');
      return { success: false, error: 'Configuración de seguridad ausente en el servidor.' };
    }

    const secret = new TextEncoder().encode(jwtSecret);
    const token = await new SignJWT({ uid: decodedToken.uid, role: 'admin', auth2fa: true })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('2h') // FIX: Reducido de 8h a 2h para máxima seguridad
      .sign(secret);

    // Inyectar Cookie HttpOnly segura como "Session Cookie" (sin maxAge, se borra al cerrar el navegador)
    const cookieStore = await cookies();
    cookieStore.set('admin-2fa-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/admin',
    });

    // Cookie de bandera pública para el cliente (no HttpOnly)
    cookieStore.set('admin-2fa-flag', 'true', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    const { logAdminAction } = await import('@/app/admin/audit-actions');
    await logAdminAction({
      adminEmail: email,
      action: 'ACCESS',
      resource: 'Admin2FA',
      details: { uid: decodedToken.uid, type: 'VERIFY_2FA_OTP_SUCCESS' },
    });

    logger.info('[2FA] Sesión 2FA establecida con éxito.', { email });
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error interno al verificar OTP';
    logger.error('[verifyAdminOtp] Error', { error: msg });
    return { success: false, error: msg };
  }
}
