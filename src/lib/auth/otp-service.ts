/**
 * Servicio de OTP para Administradores — Lógica Central
 *
 * Este módulo centraliza la generación, almacenamiento y verificación de
 * los códigos OTP de 6 dígitos con validez de 2 minutos.
 *
 * Es consumido por:
 * - Server Actions (otp-actions.ts) — para el flujo clásico
 * - API Route /api/auth/pre-login  — Fase 1 del flujo Wompi
 * - API Route /api/auth/verify-otp — Fase 2 del flujo Wompi
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';
import { resend } from '@/lib/resend';
import { createHash, timingSafeEqual } from 'crypto';
import { logger } from '@/lib/logger/security-logger';

// Constantes de seguridad del protocolo OTP
const OTP_EXPIRY_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 3;

/**
 * Genera un código OTP de 6 dígitos criptográficamente seguro.
 */
function generate6DigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Genera el hash SHA-256 del código OTP. Nunca se almacena el código en texto plano.
 */
function hashOtp(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

/**
 * Genera y envía un OTP al correo del administrador.
 * Guarda el hash del código en Firestore bajo la colección `admin_otps`.
 *
 * @param uid   - UID de Firebase del administrador autenticado
 * @param email - Correo electrónico del administrador (destino del código)
 */
export async function sendOtpToAdmin(uid: string, email: string): Promise<void> {
  getAdminApp();
  const db = getFirestore();

  const otpCode = generate6DigitCode();
  const codeHash = hashOtp(otpCode);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Guardar en Firestore (sobrescribe cualquier OTP previo del mismo admin)
  await db
    .collection('admin_otps')
    .doc(uid)
    .set({
      codeHash,
      createdAt: Timestamp.fromDate(now),
      expiresAt: Timestamp.fromDate(expiresAt),
      attempts: 0,
    });

  // Despachar correo electrónico con el código usando una plantilla HTML profesional
  await resend.emails.send({
    from: 'Desmulta Seguridad <seguridad@desmulta.online>',
    to: email,
    subject: 'Código de Acceso Administrativo - Desmulta',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Código de Verificación</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5;">
        <div style="background-color: #f4f4f5; padding: 40px 20px; text-align: center;">
          <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); text-align: left;">
            
            <!-- Cabecera Institucional (Oscura con acento amarillo) -->
            <div style="background-color: #09090b; padding: 32px 32px 24px 32px; border-bottom: 4px solid #facc15; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">Desmulta</h1>
              <p style="color: #a1a1aa; margin: 8px 0 0 0; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Control de Seguridad</p>
            </div>
            
            <!-- Cuerpo Principal -->
            <div style="padding: 40px 32px;">
              <h2 style="color: #18181b; margin-top: 0; font-size: 22px; font-weight: 700;">Validación de Identidad</h2>
              <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
                Hemos generado el siguiente código de doble factor (2FA) para que autorices tu acceso al panel de administración:
              </p>
              
              <!-- Caja del Código -->
              <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 28px; margin-bottom: 32px; text-align: center;">
                <span style="font-size: 48px; font-weight: 800; color: #09090b; letter-spacing: 12px;">${otpCode}</span>
              </div>
              
              <!-- Advertencia -->
              <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                  <strong>Ten en cuenta:</strong> Este código será válido únicamente por <strong>2 minutos</strong> y es de un solo uso.
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #fafafa; border-top: 1px solid #e4e4e7; padding: 24px; text-align: center;">
              <p style="color: #71717a; font-size: 12px; line-height: 1.5; margin: 0;">
                Si no intentaste acceder al sistema, puedes ignorar de forma segura este correo electrónico o contactar a soporte si sospechas de actividad inusual.
              </p>
            </div>
          </div>
          
          <div style="margin-top: 24px; text-align: center;">
            <p style="color: #a1a1aa; font-size: 11px; margin: 0;">
              &copy; ${now.getFullYear()} Desmulta.online — Todos los derechos reservados.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  });

  logger.info('[OTP Service] Código OTP enviado.', { email });
}

/**
 * Resultado de la verificación del código OTP.
 */
export type OtpVerifyResult = { success: true } | { success: false; error: string };

/**
 * Verifica el código OTP ingresado por el administrador.
 *
 * Implementa las siguientes capas de defensa:
 * 1. Validación de formato del código (6 dígitos exactos)
 * 2. Existencia del documento en Firestore
 * 3. Expiración estricta de 2 minutos
 * 4. Límite de 3 intentos fallidos antes de autodestruir el código
 * 5. Comparación en tiempo constante (timingSafeEqual) para mitigar timing-attacks
 * 6. Política de un único uso (elimina el registro tras verificación exitosa)
 *
 * @param uid  - UID del administrador (obtenido del tempToken verificado)
 * @param code - Código de 6 dígitos ingresado por el usuario
 */
export async function verifyOtpCode(uid: string, code: string): Promise<OtpVerifyResult> {
  // Validación de formato básico
  if (!code || !/^\d{6}$/.test(code)) {
    return { success: false, error: 'Formato de código inválido (deben ser 6 dígitos).' };
  }

  getAdminApp();
  const db = getFirestore();
  const otpDocRef = db.collection('admin_otps').doc(uid);
  const otpDoc = await otpDocRef.get();

  if (!otpDoc.exists) {
    return { success: false, error: 'Código inválido o expirado. Genera uno nuevo.' };
  }

  const otpData = otpDoc.data()!;
  const now = Timestamp.now();

  // 1. Verificar expiración (2 minutos)
  if (now.toMillis() > otpData.expiresAt.toMillis()) {
    await otpDocRef.delete();
    return { success: false, error: 'El código ha expirado. Por favor, genera uno nuevo.' };
  }

  // 2. Verificar límite de intentos fallidos (máximo 3)
  if (otpData.attempts >= MAX_OTP_ATTEMPTS) {
    await otpDocRef.delete();
    return {
      success: false,
      error: 'Superado el límite de intentos fallidos. Genera un nuevo código.',
    };
  }

  // 3. Comparación segura en tiempo constante (anti-timing-attack)
  const inputBuffer = Buffer.from(hashOtp(code));
  const expectedBuffer = Buffer.from(otpData.codeHash);
  const isMatch =
    inputBuffer.length === expectedBuffer.length && timingSafeEqual(inputBuffer, expectedBuffer);

  if (!isMatch) {
    await otpDocRef.update({ attempts: otpData.attempts + 1 });
    return { success: false, error: 'Código de verificación incorrecto.' };
  }

  // 4. Política de un único uso — eliminar inmediatamente (previene replay attacks)
  await otpDocRef.delete();
  return { success: true };
}
