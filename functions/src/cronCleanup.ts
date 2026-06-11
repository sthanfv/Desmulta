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

    // ── 4. Limpieza de Colecciones de Rate Limit y Cooldowns ──────────────
    const COLLECTIONS_TO_CLEAN = [
      'upload_rate_limits',
      'otp_rate_limits',
      'consultationCooldowns',
      'telemetryCooldowns',
      'abandonmentRateLimits',
      'referidosCooldowns',
    ];

    const limitTimestamp = admin.firestore.Timestamp.fromMillis(ahora - 2 * 24 * 60 * 60 * 1000);
    const limitDateStr = new Date(ahora - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    for (const colName of COLLECTIONS_TO_CLEAN) {
      try {
        let oldDocs;
        if (colName === 'upload_rate_limits') {
          oldDocs = await db.collection(colName).where('fecha', '<', limitDateStr).limit(200).get();
        } else {
          oldDocs = await db.collection(colName).where('updatedAt', '<', limitTimestamp).limit(200).get();
        }

        if (!oldDocs.empty) {
          const batchLimit = db.batch();
          oldDocs.docs.forEach(doc => batchLimit.delete(doc.ref));
          await batchLimit.commit();
          logger.info(`[cronLimpieza] Eliminados ${oldDocs.size} registros de ${colName}.`);
        }
      } catch (err) {
        logger.warn(`[cronLimpieza] Error limpiando la colección ${colName} (posible falta de índice):`, err);
      }
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
        const urlsParaBorrar = [];
        for (const b of blobsViejos) {
          const url = b.url;
          
          // Verificar si aún está en uso en consultas (prospectos activos)
          const consSnap = await db.collection('consultations').where('evidenceUrl', '==', url).limit(1).get();
          if (!consSnap.empty) continue;
          
          // Verificar si aún está en uso en casos (expedientes activos)
          const caseSnap = await db.collection('cases').where('evidenceUrl', '==', url).limit(1).get();
          if (!caseSnap.empty) {
            const caseData = caseSnap.docs[0].data();
            // Si el caso NO está cerrado o archivado, conservamos la imagen
            if (caseData.estado !== 'cerrado' && caseData.estado !== 'archivado' && caseData.status !== 'finalizado' && caseData.status !== 'archivo') {
              continue;
            }
          }
          
          urlsParaBorrar.push(url);
        }

        if (urlsParaBorrar.length > 0) {
          await del(urlsParaBorrar, { token: blobToken });
          logger.info(`[cronLimpieza] Purgados ${urlsParaBorrar.length} blobs de Vercel huérfanos.`);
        } else {
          logger.info(`[cronLimpieza] No hay blobs huérfanos para borrar, se conservaron los que están en casos activos.`);
        }
      }
    } else {
      logger.warn('[cronLimpieza] BLOB_READ_WRITE_TOKEN no configurado — omitiendo purga de blobs.');
    }

    // ── 6. Purgar leads (consultas) por estado y edad ────────────────────────
    // Política de retención de datos diferenciada (Privacy-first + negocio protegido):
    //   - Abandonados (pendiente/descartado) ≥ 14 días: ELIMINAR
    //   - Finalizados (finalizado/terminado) ≥ 30 días: ELIMINAR
    //   - Activos (contactado/estudio/en_proceso/radicado): NUNCA ELIMINAR
    const catorce = admin.firestore.Timestamp.fromDate(new Date(ahora - 14 * 24 * 60 * 60 * 1000));
    const treinta = admin.firestore.Timestamp.fromDate(new Date(ahora - 30 * 24 * 60 * 60 * 1000));

    const [abandonados, finalizados] = await Promise.all([
      db.collection('consultations')
        .where('status', 'in', ['pendiente', 'descartado', 'nuevo'])
        .where('createdAt', '<', catorce)
        .limit(200).get(),
      db.collection('consultations')
        .where('status', 'in', ['finalizado', 'terminado'])
        .where('createdAt', '<', treinta)
        .limit(200).get(),
    ]);

    const docsParaBorrar = [...abandonados.docs, ...finalizados.docs];

    if (docsParaBorrar.length > 0) {
      const batch5 = db.batch();
      docsParaBorrar.forEach(doc => {
        batch5.delete(doc.ref);
        const data = doc.data();
        if (data.trackingUuid) {
          batch5.delete(db.collection('public_tracking').doc(data.trackingUuid));
        }
      });
      await batch5.commit();
      logger.info(`[cronLimpieza] Purgados ${docsParaBorrar.length} leads: ${abandonados.size} abandonados (−14d) + ${finalizados.size} finalizados (−30d).`);
    } else {
      logger.info('[cronLimpieza] Sin leads elegibles para purga hoy.');
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

    // ── 8. Purgar edge_telemetry más antigua de 90 días ─────────────────────────
    try {
      const noventaDiasAtras = admin.firestore.Timestamp.fromMillis(
        ahora - 90 * 24 * 60 * 60 * 1000
      );

      const telemetriaVieja = await db
        .collection('edge_telemetry')
        .where('ts', '<', noventaDiasAtras.toMillis())
        .limit(500)
        .get();

      if (!telemetriaVieja.empty) {
        // Borrar en lotes de 500 (límite de batch de Firestore)
        const batch = db.batch();
        telemetriaVieja.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        logger.info(
          `[cronLimpieza] Purgados ${telemetriaVieja.size} registros de edge_telemetry (>90 días).`
        );
      }
    } catch (err) {
      logger.warn('[cronLimpieza] Error limpiando edge_telemetry:', err);
    }

    logger.info('[cronLimpieza] Proceso de limpieza completado exitosamente.');
  } catch (error) {
    logger.error('[cronLimpieza] Error crítico durante la limpieza:', error);
  }
});
