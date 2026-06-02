import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { del, list } from '@vercel/blob';

/**
 * Cron Job: Limpieza Integral de Base de Datos
 * Frecuencia: Todos los días a las 03:00 AM (hora Colombia)
 *
 * Tareas:
 *  1. [DELEGADO A TTL] Purgar 'processed_callbacks' (+24h)
 *  2. [DELEGADO A TTL] Purgar 'validar_consulta_rl' (+2h)
 *  3. [DELEGADO A TTL] Purgar 'otp_rate_limits' (+10m)
 *  4. Purgar 'upload_rate_limits' con fecha de ayer o anterior
 *  5. Purgar imágenes de Vercel Blob (simit_cap_) > 7 días
 *  6. Purgar 'consultations' y 'public_tracking' > 7 días (Privacidad)
 *  7. Purgar tokens push inactivos (> 45 días) de las subcolecciones 'private'
 */
export const cronLimpieza = onSchedule({
  schedule: '0 3 * * *',
  timeZone: 'America/Bogota',
  region: 'us-central1',
  memory: '512MiB',
  secrets: ['BLOB_READ_WRITE_TOKEN'],
}, async () => {
  const db = admin.firestore();
  const ahora = Date.now();

  try {
    // ── 1. Tareas de Firestore delegadas al TTL Nativo ───────────────────
    // Nota: 'processed_callbacks', 'validar_consulta_rl' y 'otp_rate_limits'
    // ahora se limpian automáticamente por políticas de TTL en Firestore.

    // ── 4. Upload rate limits con fecha anterior a hoy ────────────────────
    // Estos documentos tienen ID con formato: "IP_FECHA" (ej: 186.31.12.44_2025-04-19)
    // Se vuelven inútiles al día siguiente. Limpiamos los de hace más de 2 días.
    const twoDaysAgo = new Date(ahora - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const oldUploadRl = await db.collection('upload_rate_limits')
      .where('fecha', '<', twoDaysAgo)
      .limit(200).get();

    if (!oldUploadRl.empty) {
      const batch4 = db.batch();
      oldUploadRl.docs.forEach(doc => batch4.delete(doc.ref));
      await batch4.commit();
      logger.info(`[cronLimpieza] Eliminados ${oldUploadRl.size} registros de upload_rate_limits.`);
    }

    // ── 5. Imágenes de Vercel Blob: red de seguridad para simit_cap_ ──────
    // onConsultationCreated ya purga el blob después de enviarlo a Telegram.
    // Este paso elimina cualquier imagen huérfana que haya quedado sin procesar.
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (blobToken) {
      const sevenDaysAgo = new Date(ahora - 7 * 24 * 60 * 60 * 1000);

      // Listar blobs con prefijo simit_cap_ (las capturas de evidencia)
      const { blobs } = await list({ prefix: 'simit_cap_', token: blobToken, limit: 100 });
      const blobsViejos = blobs.filter(b => new Date(b.uploadedAt) < sevenDaysAgo);

      if (blobsViejos.length > 0) {
        const urlsParaBorrar = blobsViejos.map(b => b.url);
        await del(urlsParaBorrar, { token: blobToken });
        logger.info(`[cronLimpieza] Purgados ${blobsViejos.length} blobs de Vercel huérfanos.`);
      }
    } else {
      logger.warn('[cronLimpieza] BLOB_READ_WRITE_TOKEN no configurado — omitiendo purga de blobs.');
    }

    // ── 6. Purgar leads (consultas) mayores a 7 días ────────────────────────
    // Cumplimiento de política de retención de datos (Privacy-first)
    const sevenDaysAgoDate = new Date(ahora - 7 * 24 * 60 * 60 * 1000);
    const oldConsultations = await db.collection('consultations')
      .where('createdAt', '<', admin.firestore.Timestamp.fromDate(sevenDaysAgoDate))
      .limit(200).get();

    if (!oldConsultations.empty) {
      const batch5 = db.batch();
      oldConsultations.docs.forEach(doc => {
        batch5.delete(doc.ref);
        // Intentar borrar también su registro de tracking si existe usando el trackingUuid
        const data = doc.data();
        if (data.trackingUuid) {
          const trackingRef = db.collection('public_tracking').doc(data.trackingUuid);
          batch5.delete(trackingRef);
        }
      });
      await batch5.commit();
      logger.info(`[cronLimpieza] Purgados ${oldConsultations.size} leads (consultations) antiguos.`);
    }

    // ── 7. Purgar tokens push inactivos (> 45 días) ────────────────────────
    const fortyFiveDaysAgo = new Date(ahora - 45 * 24 * 60 * 60 * 1000).toISOString();
    const oldTokens = await db.collectionGroup('private')
      .where('tokenUpdatedAt', '<', fortyFiveDaysAgo)
      .limit(200).get();

    if (!oldTokens.empty) {
      const batch6 = db.batch();
      let tokensDeleted = 0;
      oldTokens.docs.forEach(doc => {
        if (doc.id === 'push') {
          batch6.delete(doc.ref);
          tokensDeleted++;
        }
      });
      if (tokensDeleted > 0) {
        await batch6.commit();
        logger.info(`[cronLimpieza] Purgados ${tokensDeleted} tokens Push inactivos (>45 días).`);
      }
    }

    logger.info('[cronLimpieza] Proceso de limpieza completado exitosamente.');
  } catch (error) {
    logger.error('[cronLimpieza] Error crítico durante la limpieza:', error);
  }
});
