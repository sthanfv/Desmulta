import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { decryptSymmetric } from './crypto-utils';
import { timingSafeEqual } from 'crypto';
/**
 * telegramWebhook — CRM por Telegram v2.0
 *
 * Comandos disponibles:
 *   /resumen       — Estadísticas del día
 *   /caso SHORTID  — Ver detalles de un caso específico
 *   /pendientes    — Lista los últimos 10 casos sin gestionar
 *
 * Botones inline en cada nuevo caso:
 *   [✅ Contactado] [🔍 En Estudio] [📋 Radicado] [❌ Descartar]
 *   Cada botón cambia el estado en Firestore Y notifica al cliente por email automáticamente
 *   (onCaseStatusChange ya se encarga del email — sin duplicar lógica)
 */

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number };
    text?: string;
    date: number;
  };
  callback_query?: {
    id: string;
    from: { id: number; first_name?: string };
    message?: {
      message_id: number;
      chat: { id: number };
      text?: string;
      caption?: string;
    };
    data?: string;
  };
}

// ─── Helpers de Telegram API ──────────────────────────────────────────────────

import { sendMessage, editMessageText, answerCallbackQuery } from './telegram-utils';

// ─── Mapa de estados ──────────────────────────────────────────────────────────
const ESTADOS: Record<string, { label: string; emoji: string; desc: string }> = {
  contactado:  { emoji: '✅', label: 'Contactado',    desc: 'Asignado a especialista' },
  estudio:     { emoji: '🔍', label: 'En Estudio',    desc: 'Análisis jurídico en curso' },
  apertura:    { emoji: '📂', label: 'Apertura',      desc: 'Expediente formal abierto' },
  en_proceso:  { emoji: '⚙️', label: 'En Proceso',    desc: 'Análisis técnico avanzado' },
  radicado:    { emoji: '📋', label: 'Radicado',      desc: 'Requerimiento radicado oficialmente' },
  tramite:     { emoji: '🏛️', label: 'En Trámite',    desc: 'Gestión ante entidad de tránsito' },
  finalizado:  { emoji: '🏁', label: 'Finalizado',    desc: 'Proceso concluido exitosamente' },
  descartado:  { emoji: '❌', label: 'Descartado',    desc: 'Caso no viable' },
};

// ─── Lógica de cambio de estado ───────────────────────────────────────────────

/**
 * cambiarEstado v2.0
 *
 * Qué hace en cada transición:
 *  - Siempre:  consultations.status + public_tracking.eventos[]
 *  - Si existe cases/ para este consultationId: sincroniza cases.status
 *  - Si nuevoEstado === 'contactado' Y aún no existe cases/:
 *      → crea cases/ unificando consultations + leads (por cédula)
 *      → actualiza leads.estado_gestion = 'EN_PROCESO'
 *      → actualiza consultations.caseId para el vínculo
 */
async function cambiarEstado(
  db: admin.firestore.Firestore,
  consultationId: string,
  nuevoEstado: string,
  operador: string,
  messageId?: number
): Promise<boolean> {
  try {
    const consultationRef = db.collection('consultations').doc(consultationId);
    const snap = await consultationRef.get();
    if (!snap.exists) return false;

    const data = snap.data()!;
    const estadoAnterior = data.status || 'pendiente';
    const estadoInfo = ESTADOS[nuevoEstado];

    // ── 0. Verificación de Idempotencia por Estado ────────────────────────────
    if (estadoAnterior === nuevoEstado) {
      logger.warn(`[CRM] Idempotencia: El caso ya está en estado ${nuevoEstado}. Ignorando.`);
      return false; // Evita reprocesamiento en caso de doble tap
    }

    // ── 1. Actualizar la consulta principal ───────────────────────────────────
    await consultationRef.update({
      status: nuevoEstado,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastOperator: operador
    });

    // ── 2. Actualizar public_tracking con el evento ───────────────────────────
    const trackingUuid = data.trackingUuid;
    if (trackingUuid) {
      const trackingRef = db.collection('public_tracking').doc(trackingUuid);
      const trackingSnap = await trackingRef.get();
      if (trackingSnap.exists) {
        await trackingRef.update({
          status: nuevoEstado,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          eventos: admin.firestore.FieldValue.arrayUnion({
            tipo: 'status_change',
            estadoAnterior,
            estadoNuevo: nuevoEstado,
            descripcion: estadoInfo?.desc || nuevoEstado,
            fecha: new Date().toISOString(),
            // No enviamos `operador` al cliente — Zero-PII
          }),
        });
      }
    }

    // ── 3. Buscar si ya existe un case para esta consulta ─────────────────────
    const existingCaseSnap = await db
      .collection('cases')
      .where('consultationId', '==', consultationId)
      .limit(1)
      .get();

    if (!existingCaseSnap.empty) {
      // Ya existe → solo sincronizar el estado
      await existingCaseSnap.docs[0].ref.update({
        status: nuevoEstado,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        history: admin.firestore.FieldValue.arrayUnion({
          type: 'status_change',
          date: admin.firestore.Timestamp.now(),
          description: `${estadoInfo?.emoji || '🔄'} ${estadoInfo?.label || nuevoEstado} — por ${operador}`,
        }),
      });
      logger.info(`[CRM] Case sincronizado → ${nuevoEstado}`, { consultationId });
    } else if (['apertura', 'en_proceso', 'radicado', 'tramite', 'resolucion', 'en_espera', 'finalizado', 'terminado'].includes(nuevoEstado)) {
      // ── 4. AVANCE A FASE LEGAL → Crear case unificado ───────────────────
      //
      // Buscar el lead correspondiente por cédula (si existe).
      // El lead tiene los números de comparendo y la deuda total extraídos por el OCR.
      let leadData: admin.firestore.DocumentData | null = null;
      let leadRef: admin.firestore.DocumentReference | null = null;

      const cedula = data.cedula;
      if (cedula && cedula !== 'SIMIT-CAPTURA') {
        const leadSnap = await db
          .collection('leads')
          .where('cedula', '==', cedula)
          .orderBy('ultima_actualizacion', 'desc')
          .limit(1)
          .get();
        if (!leadSnap.empty) {
          leadData = leadSnap.docs[0].data();
          leadRef = leadSnap.docs[0].ref;
        }
      }

      // Generar ID de caso tipo CASE-TIMESTAMP
      const caseId = `CASE-${Date.now()}`;
      const caseRef = db.collection('cases').doc(caseId);

      const caseDoc = {
        id: caseId,
        consultationId,
        authorUid: data.authorUid || 'SYSTEM',

        // Datos personales del formulario
        cedula: data.cedula || '',
        nombre: data.nombre || '',
        placa: data.placa || 'N/A',
        contacto: data.contacto || '',
        emailContacto: data.emailContacto || '',
        ciudad: data.ciudad || '',
        shortId: data.shortId || consultationId.slice(0, 8),

        // Datos del caso del formulario
        tipoInfraccion: data.tipoInfraccion || '',
        antiguedad: data.antiguedad || '',
        estadoCoactivo: data.estadoCoactivo || '',
        evidenceUrl: data.evidenceUrl || '',
        fuente: data.fuente || 'web',

        // Dictamen OCR (si viene del motor técnico)
        ocrData: data.ocrData || null,

        // Datos de multas del lead (si se encontró)
        multas: leadData?.multas_registradas || [],
        totalDeuda: leadData?.total_deuda_acumulada || 0,
        leadId: leadRef?.id || null,

        // Estado y ciclo de vida
        status: nuevoEstado,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        aceptadoPor: operador,

        // Historial de eventos
        documents: [],
        history: [
          {
            type: 'system',
            date: admin.firestore.Timestamp.now(),
            description: `Caso creado y aceptado por ${operador} desde Telegram CRM.`,
          },
          ...(leadData
            ? [{
                type: 'system',
                date: admin.firestore.Timestamp.now(),
                description: `Expediente vinculado: ${leadData.multas_registradas?.length || 0} multas · Deuda total: $${(leadData.total_deuda_acumulada || 0).toLocaleString('es-CO')}`,
              }]
            : []),
        ],
      };

      await caseRef.set(caseDoc);
      logger.info(`[CRM] Case creado: ${caseId}`, { consultationId, leadId: leadRef?.id });

      // Vincular el caseId de vuelta en consultations
      await consultationRef.update({ caseId });

      // Sincronizar el lead si existe
      if (leadRef) {
        await leadRef.update({
          estado_gestion: 'EN_PROCESO',
          caseId,
          ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp(),
        });
        logger.info(`[CRM] Lead sincronizado → EN_PROCESO`, { leadId: leadRef.id });
      }
    }

    logger.info(`[CRM] Estado cambiado ${estadoAnterior} → ${nuevoEstado}`, {
      consultationId,
      operador,
    });
    return true;
  } catch (err) {
    logger.error('[CRM] Error cambiando estado:', err);
    return false;
  }
}


// ─── Cloud Function ───────────────────────────────────────────────────────────

export const telegramWebhook = onRequest(
  {
    region: 'us-central1',
    minInstances: 0,
    secrets: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_WEBHOOK_SECRET', 'PII_ENCRYPTION_KEY', 'PII_HMAC_SECRET'],
  },
  async (req, res) => {
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
    const receivedToken = req.headers['x-telegram-bot-api-secret-token'];

    let isTokenValid = false;
    if (webhookSecret && typeof receivedToken === 'string') {
      const expectedBuffer = Buffer.from(webhookSecret);
      const providedBuffer = Buffer.from(receivedToken);
      if (expectedBuffer.length === providedBuffer.length) {
        isTokenValid = timingSafeEqual(expectedBuffer, providedBuffer);
      }
    }

    if (!isTokenValid) {
      logger.warn('[telegramWebhook] Secret no coincide o no configurado — ignorando.', { 
        received: typeof receivedToken === 'string' ? '[REDACTED]' : 'null', 
        expectedLength: webhookSecret?.length || 0 
      });
      res.status(200).send({ ok: true });
      return;
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      res.status(200).send({ ok: true });
      return;
    }

    let update: TelegramUpdate;
    try {
      if (typeof req.body === 'string') {
        update = JSON.parse(req.body);
      } else if (Buffer.isBuffer(req.body)) {
        update = JSON.parse(req.body.toString('utf8'));
      } else {
        update = req.body as TelegramUpdate;
      }
    } catch (e) {
      logger.error('[telegramWebhook] Error parseando req.body', { error: e, body: req.body });
      res.status(200).send({ ok: true });
      return;
    }

    const db = admin.firestore();

    logger.info(`[telegramWebhook] Recibido ${req.method}`, { isString: typeof req.body === 'string' });

    try {
      // ── CALLBACK QUERIES (botones inline) ─────────────────────────────────
      if (update.callback_query?.data) {
        const cb = update.callback_query;
        const callbackId = cb.id;
        const dataStr = cb.data!;
        const chatId = cb.message?.chat.id;
        const messageId = cb.message?.message_id;
        const operador = cb.from.first_name || `user_${cb.from.id}`;

        if (!chatId || !messageId) {
          res.status(200).send({ ok: true });
          return;
        }

        // ── Cambio de estado: estado_ESTADO_DOCID ──────────────────────────
        if (dataStr.startsWith('estado_')) {
          const cbRef = db.collection('processed_callbacks').doc(callbackId);
          try {
            await cbRef.create({ ts: new Date().toISOString(), data: dataStr });
          } catch (e) {
            await answerCallbackQuery(token, callbackId, '✅ Ya procesado');
            res.status(200).send({ ok: true });
            return;
          }

          // Parsear: "estado_contactado_ABC123" (soporta estados compuestos como en_proceso)
          const parts = dataStr.split('_');
          const consultationId = parts[parts.length - 1];
          const nuevoEstado = parts.slice(1, parts.length - 1).join('_');

          await answerCallbackQuery(token, callbackId, '⏳ Actualizando...');

          const ok = await cambiarEstado(db, consultationId, nuevoEstado, operador, messageId);

          if (ok) {
            const docSnap = await db.collection('consultations').doc(consultationId).get();
            const d = docSnap.data();
            const tel = (d?.contacto || '').replace(/\D/g, '');
            const wa = tel.startsWith('57') ? tel : `57${tel}`;
            const whatsappUrl = `https://wa.me/${wa}`;

            const estadoInfo = ESTADOS[nuevoEstado];
            // En Telegram, solo anexamos el texto de actualización sin romper el caption original si existe.
            // Para evitar un mensaje infinito, limitamos cómo se agrega la línea,
            // pero para mantenerlo simple, solo la adjuntamos.
            const msgActual = cb.message?.caption || cb.message?.text || '';
            const cleanMsg = msgActual.split('\n\n🔍 <b>Estado actualizado:</b>')[0].split('\n\n✅ <b>Estado actualizado:</b>')[0].split('\n\n📋 <b>Estado actualizado:</b>')[0].split('\n\n❌ <b>Estado actualizado:</b>')[0];
            const nuevaLinea = `\n\n${estadoInfo?.emoji || '🔄'} <b>Estado actualizado:</b> ${estadoInfo?.label || nuevoEstado} — por ${operador}`;

            await editMessageText(
              token,
              chatId,
              messageId,
              cleanMsg + nuevaLinea,
              buildCaseReplyMarkup(consultationId, whatsappUrl, nuevoEstado)
            );
            await answerCallbackQuery(token, callbackId, `${estadoInfo?.emoji} Listo — Estado: ${estadoInfo?.label}`);
          } else {
            await answerCallbackQuery(token, callbackId, '❌ Error al actualizar', true);
          }

          res.status(200).send({ ok: true });
          return;
        }

        // ── Revelar Cédula: vercedula_DOCID ──────────────────────────────────
        if (dataStr.startsWith('vercedula_')) {
          const cbRef = db.collection('processed_callbacks').doc(callbackId);
          try {
            await cbRef.create({ ts: new Date().toISOString(), data: dataStr });
          } catch (e) {
            await answerCallbackQuery(token, callbackId, '✅ Ya procesado');
            res.status(200).send({ ok: true });
            return;
          }

          const consultationId = dataStr.replace('vercedula_', '');
          
          try {
            const docSnap = await db.collection('consultations').doc(consultationId).get();
            if (!docSnap.exists) {
              await answerCallbackQuery(token, callbackId, '❌ Caso no encontrado', true);
              res.status(200).send({ ok: true });
              return;
            }

            const d = docSnap.data();
            const encryptedCedula = d?.cedula;

            if (!encryptedCedula || encryptedCedula === 'SIMIT-CAPTURA') {
              await answerCallbackQuery(token, callbackId, '⚠️ Sin cédula registrada', true);
            } else {
              const decrypted = decryptSymmetric(encryptedCedula);
              await answerCallbackQuery(token, callbackId, `🪪 Cédula del Cliente:\n\n${decrypted}`, true);
            }
          } catch (err) {
            logger.error('[CRM] Error desencriptando cédula en Telegram callback:', err);
            await answerCallbackQuery(token, callbackId, '❌ Error de seguridad al descifrar cédula', true);
          }

          res.status(200).send({ ok: true });
          return;
        }

        // ── Push legacy (compatibilidad con botones anteriores) ─────────────
        if (dataStr.startsWith('push_')) {
          const cbRef = db.collection('processed_callbacks').doc(callbackId);
          try {
            await cbRef.create({ ts: new Date().toISOString(), data: dataStr });
          } catch (e) {
            await answerCallbackQuery(token, callbackId, '✅ Ya procesado');
            res.status(200).send({ ok: true });
            return;
          }

          const isViable = dataStr.startsWith('push_viable_');
          const docId = dataStr.replace(isViable ? 'push_viable_' : 'push_inviable_', '');

          await answerCallbackQuery(token, callbackId, '🚀 Enviando push...');

          const docSnap = await db.collection('consultations').doc(docId).get();
          if (docSnap.exists) {
            let fcmToken = docSnap.data()?.fcmToken;
            if (!fcmToken) {
              const pushSnap = await db.collection('consultations').doc(docId).collection('private').doc('push').get();
              if (pushSnap.exists) {
                fcmToken = pushSnap.data()?.fcmToken;
              }
            }
            if (fcmToken) {
              try {
                await admin.messaging().send({
                  token: fcmToken,
                  notification: {
                    title: '📍 Desmulta Legal',
                    body: isViable
                      ? '¡Tu caso tiene altas probabilidades de éxito! Toca para ver detalles.'
                      : 'Nuestro equipo evaluó tu expediente. Toca para ver los pasos a seguir.',
                  },
                  webpush: {
                    fcmOptions: {
                      link: `https://desmulta.online/seguir/${docId}`,
                    },
                  },
                });
                await answerCallbackQuery(token, callbackId, '✅ Push entregado');
              } catch {
                await answerCallbackQuery(token, callbackId, '❌ Error en push', true);
              }
            } else {
              await answerCallbackQuery(token, callbackId, '⚠️ Cliente sin push habilitado');
            }
          }

          res.status(200).send({ ok: true });
          return;
        }

        // noop
        if (dataStr === 'noop') {
          await answerCallbackQuery(token, callbackId, '⚠️ El caso ya se encuentra en este estado.', true);
          res.status(200).send({ ok: true });
          return;
        }

        await answerCallbackQuery(token, callbackId, '');
        res.status(200).send({ ok: true });
        return;
      }

      // ── COMANDOS DE TEXTO ─────────────────────────────────────────────────
      const message = update.message;
      if (!message?.text) {
        res.status(200).send({ ok: true });
        return;
      }

      const chatId = message.chat.id;
      const rawText = message.text.trim();
      const text = rawText.toLowerCase();

      // /start
      if (text === '/start' || text.startsWith('/start@')) {
        await sendMessage(
          token,
          chatId,
          `🤖 <b>DESMULTA CRM BOT</b>\n\n` +
            `Gestiona tus casos directamente desde Telegram.\n\n` +
            `<b>Comandos:</b>\n` +
            `/resumen — Estadísticas del día\n` +
            `/pendientes — Últimos 10 casos sin gestionar\n` +
            `/caso SHORTID — Ver detalles de un caso\n`
        );
        res.status(200).send({ ok: true });
        return;
      }

      // /resumen — estadísticas del día (Colombia TZ)
      if (text === '/resumen' || text.startsWith('/resumen@')) {
        const ahoraCol = new Date(
          new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' })
        );
        const inicioHoy = new Date(ahoraCol);
        inicioHoy.setHours(0, 0, 0, 0);

        const col = db.collection('consultations');
        const [totalSnap, pendientesSnap, hoySnap, contactadosSnap] = await Promise.all([
          col.count().get(),
          col.where('status', '==', 'pendiente').count().get(),
          col
            .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(inicioHoy))
            .count()
            .get(),
          col
            .where('status', 'in', [
              'contactado', 'estudio', 'apertura', 'en_proceso', 'radicado', 'tramite',
            ])
            .count()
            .get(),
        ]);

        await sendMessage(
          token,
          chatId,
          `📊 <b>RESUMEN DESMULTA</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `📥 <b>Nuevos hoy:</b> ${hoySnap.data().count}\n` +
            `⏳ <b>Sin gestionar:</b> ${pendientesSnap.data().count}\n` +
            `⚙️ <b>En proceso:</b> ${contactadosSnap.data().count}\n` +
            `📦 <b>Total histórico:</b> ${totalSnap.data().count}\n\n` +
            `<i>Usa /pendientes para ver los que necesitan atención.</i>`
        );
        res.status(200).send({ ok: true });
        return;
      }

      // /pendientes — lista casos pendientes recientes
      if (text === '/pendientes' || text.startsWith('/pendientes@')) {
        const snap = await db
          .collection('consultations')
          .where('status', '==', 'pendiente')
          .orderBy('createdAt', 'desc')
          .limit(10)
          .get();

        if (snap.empty) {
          await sendMessage(token, chatId, '✅ <b>Sin pendientes.</b> Todo gestionado.');
          res.status(200).send({ ok: true });
          return;
        }

        let msg = `⏳ <b>CASOS PENDIENTES (${snap.size})</b>\n━━━━━━━━━━━━━━━━━━━━\n\n`;
        for (const doc of snap.docs) {
          const d = doc.data();
          const tel = (d.contacto || '').replace(/\D/g, '');
          const wa = tel.startsWith('57') ? tel : `57${tel}`;
          msg +=
            `🆔 <code>${d.shortId || doc.id.slice(0, 8)}</code> — ${d.nombre || 'Sin nombre'}\n` +
            `   📱 <a href="https://wa.me/${wa}">${d.contacto || 'sin tel'}</a> · ${d.ciudad || ''}\n` +
            `   /caso_${d.shortId || doc.id.slice(0, 8)}\n\n`;
        }
        msg += `<i>Usa /caso SHORTID para gestionar uno específico.</i>`;
        await sendMessage(token, chatId, msg);
        res.status(200).send({ ok: true });
        return;
      }

      // /caso SHORTID o /caso_SHORTID
      const casoMatch =
        rawText.match(/^\/caso[_ ]([A-Z0-9-]+)$/i) ||
        rawText.match(/^\/caso[_ @]([A-Z0-9-]+)/i);

      if (casoMatch) {
        const shortId = casoMatch[1].toUpperCase();

        const snap = await db
          .collection('consultations')
          .where('shortId', '==', shortId)
          .limit(1)
          .get();

        if (snap.empty) {
          await sendMessage(token, chatId, `❌ No se encontró el caso <code>${shortId}</code>.`);
          res.status(200).send({ ok: true });
          return;
        }

        const doc = snap.docs[0];
        const d = doc.data();
        const tel = (d.contacto || '').replace(/\D/g, '');
        const wa = tel.startsWith('57') ? tel : `57${tel}`;
        const estadoInfo = ESTADOS[d.status] || { emoji: '⏳', label: d.status };

        const msg =
          `📁 <b>CASO ${shortId}</b>\n━━━━━━━━━━━━━━━━━━━━\n\n` +
          `👤 ${d.nombre || 'Sin nombre'}\n` +
          `🚗 Placa: <code>${d.placa || 'N/A'}</code>\n` +
          `📍 ${d.ciudad || 'N/A'}\n` +
          `📱 <a href="https://wa.me/${wa}">${d.contacto || 'sin tel'}</a>\n` +
          (d.emailContacto ? `📧 ${d.emailContacto}\n` : '') +
          (d.tipoInfraccion ? `🔸 ${d.tipoInfraccion}\n` : '') +
          (d.antiguedad ? `⏳ Antigüedad: ${d.antiguedad}\n` : '') +
          `\n${estadoInfo.emoji} <b>Estado actual:</b> ${estadoInfo.label}\n`;

        await sendMessage(token, chatId, msg, buildCaseReplyMarkup(doc.id, `https://wa.me/${wa}`));
        res.status(200).send({ ok: true });
        return;
      }

      // Comando desconocido
      await sendMessage(
        token,
        chatId,
        `❓ Comando no reconocido.\nUsa /start para ver los comandos disponibles.`
      );
      res.status(200).send({ ok: true });
    } catch (err) {
      logger.error('[telegramWebhook] Error crítico:', err);
      res.status(200).send({ ok: true }); // Siempre 200 a Telegram
    }
  }
);

/**
 * buildCaseReplyMarkup — exportado para uso en onConsultationCreated.ts
 *
 * Refleja los 8 estados exactos del Kanban web, agrupados por fase:
 *   FASE LEAD:  Nuevo → Contactado → En Estudio → Descartado
 *   FASE CASO:  Apertura → Radicado → En Trámite → Finalizado
 *
 * El estado actual se marca con 👉 y su botón no genera acción.
 */
export function buildCaseReplyMarkup(consultationDocId: string, whatsappUrl: string, currentState?: string) {
  const getBtn = (estado: string, label: string) => {
    if (currentState === estado) {
      return { text: `👉 ${label}`, callback_data: 'noop' };
    }
    return { text: label, callback_data: `estado_${estado}_${consultationDocId}` };
  };

  return {
    inline_keyboard: [
      // ── Fase 1: Pipeline de Leads ──────────────────────────────────────────
      [
        getBtn('pendiente', '🆕 Nuevo'),
        getBtn('contactado', '✅ Contactado'),
      ],
      [
        getBtn('estudio', '🔍 En Estudio'),
        getBtn('descartado', '❌ Descartar'),
      ],
      // ── Fase 2: Pipeline de Casos ──────────────────────────────────────────
      [
        getBtn('apertura', '🚀 Apertura'),
        getBtn('radicado', '📋 Radicado'),
      ],
      [
        getBtn('tramite', '⚙️ En Trámite'),
        getBtn('finalizado', '🏁 Finalizado'),
      ],
      // ── Acciones de Contacto e Identidad ───────────────────────────────────
      [
        { text: '📱 WhatsApp', url: whatsappUrl },
        { text: '🪪 Ver Cédula', callback_data: `vercedula_${consultationDocId}` },
      ],
    ],
  };
}
