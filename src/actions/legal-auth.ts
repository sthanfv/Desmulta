'use server';

import { z } from 'zod';
import { resend } from '@/lib/resend';
import { randomInt } from 'crypto';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { headers } from 'next/headers';
import { logger } from '@/lib/logger/security-logger';

// ✅ Esquemas de validación de entrada
const EmailSchema = z.string().email().max(254);
const DocumentIdSchema = z.string().regex(/^[a-zA-Z0-9_-]{10,50}$/, {
  message: 'documentId debe tener entre 10 y 50 caracteres alfanuméricos',
});

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutos
const MAX_OTP_ATTEMPTS = 3;
const MAX_VERIFY_ATTEMPTS = 5;

export async function dispatchOTP(email: string, documentId: string) {
  // ✅ 1. Validar formato de email
  const emailResult = EmailSchema.safeParse(email);
  if (!emailResult.success) {
    return { status: 400, error: 'EMAIL_INVALID' };
  }

  // ✅ 2. Validar documentId
  const docIdResult = DocumentIdSchema.safeParse(documentId);
  if (!docIdResult.success) {
    return { status: 400, error: 'DOCUMENT_ID_INVALID' };
  }

  try {
    getAdminApp();
    const db = getFirestore();

    // ✅ 3. Rate limit: máximo 3 OTPs por documentId en 10 minutos
    const rateLimitRef = db.collection('otp_rate_limits').doc(documentId);
    const rateLimitSnap = await rateLimitRef.get();

    if (rateLimitSnap.exists) {
      const rateData = rateLimitSnap.data()!;
      const windowStart = rateData.windowStart || 0;
      const count = rateData.count || 0;
      const windowExpired = Date.now() - windowStart >= RATE_LIMIT_WINDOW_MS;

      if (!windowExpired && count >= MAX_OTP_ATTEMPTS) {
        logger.warn('[legal-auth] Rate limit OTP alcanzado', { documentId });
        const remainingMs = RATE_LIMIT_WINDOW_MS - (Date.now() - windowStart);
        const remainingMins = Math.ceil(remainingMs / 60000);
        return {
          status: 429,
          error: `Ha alcanzado el límite de códigos enviados. Podrá solicitar uno nuevo en ${remainingMins} ${remainingMins === 1 ? 'minuto' : 'minutos'}.`,
        };
      }

      if (windowExpired) {
        // Resetear ventana si expiró
        await rateLimitRef.set({ windowStart: Date.now(), count: 1 });
      } else {
        await rateLimitRef.update({ count: count + 1 });
      }
    } else {
      await rateLimitRef.set({ windowStart: Date.now(), count: 1 });
    }

    const otpCode = randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // TTL: 5 minutos

    // Captura de IP nativa en Next.js App Router (Blindaje Legal)
    const headersList = await headers();
    const clientIp =
      headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'IP_NOT_FOUND';
    const userAgent = headersList.get('user-agent') || 'UNKNOWN_AGENT';

    await db.collection('legal_mandates').doc(documentId).set({
      otpCode,
      expiresAt,
      status: 'PENDING',
      failedAttempts: 0,
      clientIp,
      userAgent,
      timestamp: new Date().toISOString(),
    });

    await resend.emails.send({
      from: 'Desmulta Legal <legal@desmulta.online>',
      to: email,
      subject: 'Código de Firma Electrónica - Desmulta',
      text: `Tu código de autorización legal es: ${otpCode}. Expira en 5 minutos.`,
    });

    return { status: 200, message: 'OTP_SENT' };
  } catch (error) {
    logger.error('[legal-auth] DISPATCH_ERROR', { error: String(error) });
    return { status: 500, error: 'INTERNAL_SERVER_ERROR' };
  }
}

export async function verifyOTP(documentId: string, inputCode: string) {
  // ✅ Validar formato del código antes de tocar la DB (evita inyecciones y bots)
  if (!inputCode || !/^\d{6}$/.test(inputCode)) {
    return { status: 400, error: 'INVALID_FORMAT' };
  }

  // ✅ Validar documentId
  const docIdResult = DocumentIdSchema.safeParse(documentId);
  if (!docIdResult.success) {
    return { status: 400, error: 'DOCUMENT_ID_INVALID' };
  }

  try {
    getAdminApp();
    const db = getFirestore();
    const docRef = db.collection('legal_mandates').doc(documentId);
    const snapshot = await docRef.get();

    if (!snapshot.exists) return { status: 404, error: 'MANDATE_NOT_FOUND' };

    const data = snapshot.data()!;

    // ✅ Anti fuerza bruta: máximo MAX_VERIFY_ATTEMPTS intentos
    const failedAttempts = data.failedAttempts || 0;
    if (failedAttempts >= MAX_VERIFY_ATTEMPTS) {
      logger.warn('[legal-auth] Intentos máximos de verificación OTP alcanzados', { documentId });
      return {
        status: 429,
        error:
          'Ha superado el número máximo de intentos de verificación. Por seguridad, deberá solicitar un nuevo código.',
      };
    }

    if (Date.now() > data.expiresAt) return { status: 403, error: 'OTP_EXPIRED' };

    if (data.otpCode !== inputCode) {
      // ✅ Incrementar contador de fallos
      await docRef.update({ failedAttempts: failedAttempts + 1 });
      return { status: 401, error: 'INVALID_CODE' };
    }

    // ✅ Purga completa al verificar exitosamente (Zero-PII config)
    await docRef.update({ status: 'VERIFIED', otpCode: null, failedAttempts: 0 });
    return { status: 200, message: 'SIGNATURE_VALIDATED' };
  } catch (error) {
    logger.error('[legal-auth] VERIFY_ERROR', { error: String(error) });
    return { status: 500, error: 'INTERNAL_SERVER_ERROR' };
  }
}
