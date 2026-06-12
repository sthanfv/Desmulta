/**
 * API Route: /api/internal/followup-cron
 *
 * Seguimiento automático de leads inactivos.
 * Ejecución: Vercel Cron Job — Diariamente a las 08:00 AM (COL, UTC-5 → 13:00 UTC)
 *
 * Seguridad:
 * - Requiere header "Authorization: Bearer <CRON_SECRET>"
 * - Protegido por CRON_SECRET de 64 caracteres hex (rotado en .env)
 *
 * Lógica:
 * - Busca leads en estado "contactado" con updatedAt < 72 horas
 * - Omite leads que ya tengan el campo "followUpSentAt" (anti-duplicado)
 * - Máximo 50 emails por ejecución (rate-limit de seguridad)
 * - Marca cada lead procesado con "followUpSentAt" para no repetir
 */

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { resend } from '@/lib/resend';
import { buildFollowUpEmail } from '@/lib/email-templates';
import { logger } from '@/lib/logger/security-logger';

// ── Constantes ────────────────────────────────────────────────────────────────

const MAX_EMAILS_PER_RUN = 50;
const INACTIVITY_HOURS = 72;
const ELIGIBLE_STATUSES = ['contactado'];

// ── Handler principal ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // 1. Autenticación del Cron (Bearer token)
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    logger.error('[followup-cron] CRON_SECRET no configurado en variables de entorno.');
    return NextResponse.json({ error: 'Configuración incompleta en servidor.' }, { status: 500 });
  }

  const provided = Buffer.from(authHeader ?? '');
  const expected = Buffer.from(`Bearer ${cronSecret}`);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    logger.warn('[followup-cron] Intento de acceso no autorizado.', {
      ip: req.headers.get('x-forwarded-for') ?? 'unknown',
    });
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  // 2. Preparar ventana de tiempo (72 horas atrás)
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - INACTIVITY_HOURS);
  const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

  try {
    getAdminApp();
    const db = getFirestore();

    // 3. Consultar leads elegibles:
    //    - estado "contactado"
    //    - updatedAt menor a hace 72 horas
    //    - sin campo followUpSentAt (no enviados aún)
    //    - con email registrado
    // BUG-FIX: El campo en Firestore es 'emailContacto', no 'email'.
    // La query anterior devolvía siempre 0 resultados y ningún correo se enviaba.
    const snapshot = await db
      .collection('consultations')
      .where('status', 'in', ELIGIBLE_STATUSES)
      .where('updatedAt', '<=', cutoffTimestamp)
      .where('emailContacto', '!=', null)
      .limit(MAX_EMAILS_PER_RUN)
      .get();

    if (snapshot.empty) {
      logger.info('[followup-cron] Sin leads elegibles. Ejecución limpia.');
      return NextResponse.json({ processed: 0, skipped: 0, message: 'Sin leads elegibles.' });
    }

    let processed = 0;
    let skipped = 0;
    const batch = db.batch();
    const emailPromises: Promise<unknown>[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();

      // Anti-duplicado: si ya se envió follow-up, ignorar
      if (data.followUpSentAt) {
        skipped++;
        return;
      }

      // BUG-FIX: El campo correcto es 'emailContacto', no 'email'
      if (!data.emailContacto || typeof data.emailContacto !== 'string' || !data.emailContacto.includes('@')) {
        skipped++;
        return;
      }

      const nombre = data.nombre || 'Cliente';
      const trackingUuid = data.trackingUuid;
      const trackingUrl = trackingUuid
        ? `https://desmulta.online/seguir/${trackingUuid}`
        : 'https://desmulta.online';

      // Encolar envío de email
      emailPromises.push(
        resend.emails.send({
          from: 'Desmulta <no-reply@desmulta.online>',
          to: [data.emailContacto],
          subject: `${nombre}, tu caso con Desmulta está listo para continuar`,
          html: buildFollowUpEmail(nombre, trackingUrl),
        })
      );

      // Marcar lead en batch (una sola escritura masiva)
      batch.update(doc.ref, {
        followUpSentAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      processed++;
    });

    // 4. Ejecutar envíos de email en paralelo (con manejo de errores individuales)
    const results = await Promise.allSettled(emailPromises);
    const emailErrors = results.filter((r) => r.status === 'rejected').length;

    // 5. Confirmar marcas en Firestore (solo si hubo al menos uno procesado)
    if (processed > 0) {
      await batch.commit();
    }

    logger.info('[followup-cron] Ejecución completada.', { processed, skipped, emailErrors });

    return NextResponse.json({
      processed,
      skipped,
      emailErrors,
      message: `Follow-up completado: ${processed} enviados, ${skipped} omitidos, ${emailErrors} fallos de email.`,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error interno del cron';
    logger.error('[followup-cron] Error fatal en ejecución.', { error: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
