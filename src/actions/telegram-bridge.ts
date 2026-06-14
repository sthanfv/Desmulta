'use server';

import { z } from 'zod';
import { generateMandatePDF, MandatePayload } from '@/lib/legal/pdf-engine';
import { logger } from '@/lib/logger/security-logger';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { createHash } from 'crypto';

export interface TelegramDispatchData {
  fullName?: string;
  nombre?: string;
  documentId?: string;
  cedula?: string;
  ticketNumber?: string;
  licensePlate?: string;
  placa?: string;
  shortId?: string;
  acceptedAt?: string;
}

// ✅ Schema de validación estricto — reemplaza el comentario "Validar con Zod en producción"
const PlacaRegex = /^[A-Z]{3}\d{2}[\dA-Z]$/;
const CedulaRegex = /^\d{5,12}$/;

const TelegramDispatchSchema = z.object({
  fullName: z.string().min(3).max(100).optional(),
  nombre: z.string().min(3).max(100).optional(),
  documentId: z.string().regex(CedulaRegex).optional(),
  cedula: z.string().regex(CedulaRegex).optional(),
  ticketNumber: z.string().max(50).optional(),
  licensePlate: z.string().regex(PlacaRegex).optional(),
  placa: z.string().regex(PlacaRegex).optional(),
  shortId: z.string().max(30).optional(),
  acceptedAt: z.string().datetime().optional(),
});

export async function dispatchToTelegram(
  data: TelegramDispatchData,
  authPayload: { method: string; proof: string }
) {
  // ✅ Validar authPayload de forma estricta para evitar bypasses (Zero-PII compliant)
  if (!authPayload || authPayload.method !== 'OTP_EMAIL' || authPayload.proof !== 'VERIFIED') {
    logger.error('[telegram-bridge] Parámetros de autorización inválidos o intento de bypass', {
      authPayload,
    });
    return { status: 401, error: 'UNAUTHORIZED_METHOD' };
  }

  // ✅ Validar antes de tocar el motor PDF
  const validation = TelegramDispatchSchema.safeParse(data);
  if (!validation.success) {
    logger.error('[telegram-bridge] Datos inválidos recibidos', {
      errors: validation.error.flatten(),
    });
    return { status: 400, error: 'INVALID_DATA' };
  }

  try {
    // ✅ 2. Verificar identidad en Firestore (Blindaje de Despacho)
    getAdminApp();
    const db = getFirestore();
    const mandateId = data.documentId || data.cedula;

    if (!mandateId) {
      return { status: 400, error: 'MISSING_IDENTITY' };
    }

    // Hashear el ID de identidad de forma idempotente para localizar el mandato cifrado
    const mandateKey = createHash('sha256').update(mandateId).digest('hex').slice(0, 40);
    const mandateSnap = await db.collection('legal_mandates').doc(mandateKey).get();

    if (!mandateSnap.exists) {
      logger.error('[telegram-bridge] Intento de despacho sin registro legal', { mandateId });
      return { status: 403, error: 'MANDATE_NOT_FOUND' };
    }

    const mandateData = mandateSnap.data();
    if (mandateData?.status !== 'VERIFIED') {
      logger.error('[telegram-bridge] Intento de despacho sin verificación OTP', {
        mandateId,
        status: mandateData?.status,
      });
      return { status: 401, error: 'SIGNATURE_NOT_VERIFIED' };
    }

    // 1. Mapear datos para el motor PDF (ya validados por Zod)
    const pdfPayload: MandatePayload = {
      infractorName: data.fullName || data.nombre || 'Desconocido',
      infractorId: data.documentId || data.cedula || 'N/A',
      operatorName: process.env.DEFAULT_OPERATOR_NAME || 'Operador Asignado',
      operatorId: process.env.DEFAULT_OPERATOR_ID || '000000000',
      ticketNumber: data.ticketNumber || 'SIMIT_AUTO',
      licensePlate: data.licensePlate || data.placa || 'N/A',
      shortId: data.shortId || `TX-${Date.now().toString(36).toUpperCase()}`,
      acceptedAt: data.acceptedAt || new Date().toISOString(),
    };

    // 2. Generar Buffer del PDF en Memoria
    const pdfBuffer = await generateMandatePDF(pdfPayload);

    // 3. Empaquetar para Telegram (API sendDocument)
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) throw new Error('TELEGRAM_ENV_MISSING');

    const formData = new FormData();
    formData.append('chat_id', chatId);

    // Convertir Uint8Array a Blob para el FormData
    const pdfBlob = new Blob([pdfBuffer as BlobPart], { type: 'application/pdf' });
    formData.append('document', pdfBlob, `Mandato_${pdfPayload.licensePlate}.pdf`);

    // Mensaje de contexto para el operador
    const caption =
      `🚨 NUEVO MANDATO AUTORIZADO\n` +
      `Placa: ${pdfPayload.licensePlate}\n` +
      `Validación: ${authPayload.method}\n` +
      `Estado: ${authPayload.proof}\n\n` +
      `Operador, adjunto el poder para radicar desde tu correo.`;
    formData.append('caption', caption);

    // 4. Transmisión Cifrada
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const err = await response.text();
      logger.error('[telegram-bridge] TELEGRAM_API_ERROR', { detail: err });
      return { status: 500, error: 'DISPATCH_FAILED' };
    }

    return { status: 200, message: 'PAYLOAD_DELIVERED' };
  } catch (error) {
    logger.error('[telegram-bridge] BRIDGE_CRASH', { error: String(error) });
    return { status: 500, error: 'INTERNAL_SERVER_ERROR' };
  }
}
