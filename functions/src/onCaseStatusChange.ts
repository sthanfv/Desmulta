import { onDocumentUpdated, onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { Resend } from 'resend';
import { buildCaseReplyMarkup } from './telegramWebhook';
import * as QRCode from 'qrcode';
import { sendCaseUpdateNotification } from './push-notifications';

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
/**
 * Trigger: onCaseStatusChange & onCaseCreated
 * Escucha cambios y creaciones en 'cases/{caseId}' y envía emails de notificación al ciudadano.
 */

interface CaseAfterData {
  consultationId?: string;
  status?: string;
  history?: Array<{
    operatorNote?: string;
    date?: string;
    description?: string;
    type?: string;
  }>;
  timeline_updates?: Array<{
    operatorNote?: string;
  }>;
  cedula?: string;
  nombre?: string;
  contacto?: string;
  trackingUuid?: string;
  shortId?: string;
  emailContacto?: string;
  email?: string;
  telegramMessageId?: string;
  fcmToken?: string;
}

async function processCaseEmail(caseId: string, after: CaseAfterData, isNew: boolean, isLead: boolean = false) {
  const consultationId = isLead ? caseId : after.consultationId;
  const status = after.status;
  if (!consultationId || consultationId === 'N/A' || !status) {
    return;
  }

  try {
    const db = admin.firestore();
    const leadSnap = await db.collection('consultations').doc(consultationId).get();
    
    if (!leadSnap.exists) {
      logger.warn(`[processCaseEmail] No se encontró la consulta vinculada: ${consultationId}`);
      return;
    }

    const leadData = leadSnap.data();
    const emailCiudadano = leadData?.emailContacto || leadData?.email;
    const trackingUuid = leadData?.trackingUuid;
    const shortId = leadData?.shortId || caseId.slice(0, 8);

    let operatorNote: string | undefined;
    const historyArray = after.history || after.timeline_updates || [];
    if (Array.isArray(historyArray)) {
      const lastNoteEvent = historyArray.slice().reverse().find((e: { operatorNote?: string }) => e.operatorNote);
      if (lastNoteEvent) operatorNote = lastNoteEvent.operatorNote;
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const descripciones: Record<string, { asunto: string; titulo: string; explicacion: string; color: string }> = {
      contactado: {
        asunto: '📞 Un especialista se pondrá en contacto contigo - Desmulta',
        titulo: '¡Tu caso ha sido asignado!',
        explicacion: '¡Hola! Te confirmamos que tu caso ha sido asignado a uno de nuestros especialistas. Muy pronto te escribiremos por WhatsApp para darte el veredicto final y el plan de acción.',
        color: '#D4AF37',
      },
      apertura: {
        asunto: '🚀 Tu expediente ha sido abierto - Desmulta',
        titulo: 'Hemos iniciado tu gestión formal',
        explicacion: '¡Hola! Te confirmamos que ya registramos oficialmente tu caso en nuestro sistema. A partir de ahora, un especialista técnico liderará tu proceso para buscar el mejor resultado posible ante las autoridades.',
        color: '#D4AF37',
      },
      documentacion: {
        asunto: '📂 Validando tu documentación - Desmulta',
        titulo: 'Organizando tus evidencias',
        explicacion: 'Estamos en la fase de armado de expediente. Revisamos cada foto y dato que nos enviaste para que la reclamación sea sólida. Si nos hace falta algo, te avisaremos de inmediato.',
        color: '#D4AF37',
      },
      estudio: {
        asunto: '🔍 Caso en análisis jurídico - Desmulta',
        titulo: 'Buscando los mejores argumentos',
        explicacion: 'Nuestros especialistas técnicos y legales están analizando a profundidad la normativa vigente para aplicarla a tu favor. No solo tramitamos, estudiamos cada oportunidad legal para ganar tu caso.',
        color: '#D4AF37',
      },
      tramite: {
        asunto: '⚙️ Tu solicitud está en camino - Desmulta',
        titulo: 'Gestión ante el organismo de tránsito',
        explicacion: 'Ya estamos moviendo los hilos necesarios. Tu solicitud está navegando por los canales administrativos correspondientes para lograr una resolución.',
        color: '#D4AF37',
      },
      radicado: {
        asunto: '📋 Radicación oficial completada - Desmulta',
        titulo: '¡Tu reclamación ya es oficial!',
        explicacion: 'Hoy hemos radicado formalmente tu documento de defensa ante las autoridades de tránsito. Ya tenemos el sello de recibido y ahora la pelota está en su cancha.',
        color: '#D4AF37',
      },
      en_espera: {
        asunto: '⏳ Aguardando respuesta oficial - Desmulta',
        titulo: 'Paciencia, estamos en espera',
        explicacion: 'Hemos cumplido con todos los pasos y ahora dependemos de los tiempos de ley de la autoridad de tránsito. Estamos monitoreando diariamente para avisarte apenas respondan.',
        color: '#D4AF37',
      },
      resolucion: {
        asunto: '⚖️ Tu caso entró en fase de resolución - Desmulta',
        titulo: 'La autoridad está decidiendo',
        explicacion: 'La entidad de tránsito ya tiene una postura sobre tu reclamación. Nuestro equipo está revisando minuciosamente su respuesta para asegurarnos de que se cumplan tus derechos.',
        color: '#D4AF37',
      },
      finalizado: {
        asunto: '✅ Gestión concluida exitosamente - Desmulta',
        titulo: 'Hemos llegado al final del proceso',
        explicacion: 'El ciclo de tu expediente ha terminado. Esperamos que el resultado sea el que buscábamos. Recuerda verificar tu estado en el RUNT/SIMIT en los próximos días para ver el cambio reflejado.',
        color: '#D4AF37',
      },
      archivo: {
        asunto: '📁 Expediente archivado - Desmulta',
        titulo: 'Caso guardado en archivo general',
        explicacion: 'Hemos movido tu expediente a nuestro archivo histórico. Tu información seguirá protegida y disponible si decides consultarla en el futuro.',
        color: '#D4AF37',
      },
    };

    const info = descripciones[status.toLowerCase()] || {
      asunto: '📬 Novedades en tu expediente - Desmulta',
      titulo: 'Actualización en tu proceso legal',
      explicacion: 'Hola, te informamos que hemos actualizado el estado de tu expediente administrativo. Seguimos trabajando con el compromiso de siempre para defender tus intereses.',
      color: '#D4AF37',
    };

    // ─── Push notification automático al cliente ──────────────────────────
    // [DEPRECADO] El envío de notificaciones Push ahora se maneja en el Motor 
    // de Despacho (notification-dispatcher.ts) directamente desde actions.ts
    // cuando el operador mueve la tarjeta en el Kanban. Mantener esto aquí 
    // generaba notificaciones duplicadas (visto en producción).

    if (!emailCiudadano) {
      logger.info(`[processCaseEmail] El caso ${caseId} no tiene email de contacto. Solo Push fue enviado.`);
      return;
    }

    let qrImageUrl = '';
    if (trackingUuid) {
      // En lugar de enviar un base64 que es bloqueado por Gmail, usamos la ruta API pública.
      qrImageUrl = `https://desmulta.online/api/qr?data=${encodeURIComponent(`https://desmulta.online/seguir/${trackingUuid}`)}`;
    }

    const { data, error } = await resend.emails.send({
      from: 'Desmulta Gestión <gestion@desmulta.online>',
      to: emailCiudadano,
      subject: info.asunto,
      html: `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2c3e50; line-height: 1.6; background-color: #f8f9fa; padding: 20px;">
          <div style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
            <div style="text-align: center; padding: 25px; background: #000000; border-bottom: 4px solid #D4AF37;">
               <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px;">DES<span style="color: #D4AF37;">MULTA</span></h1>
            </div>
            
            <div style="padding: 40px 30px;">
              <h2 style="color: #000000; font-size: 20px; margin-top: 0;">${info.titulo}</h2>
              <p style="font-size: 16px; color: #4a5568;">${info.explicacion}</p>
              
              ${operatorNote ? `
              <div style="margin: 25px 0; padding: 20px; background: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #166534; font-weight: bold; margin-bottom: 8px;">🧑‍💼 Mensaje de tu asesor:</p>
                <p style="margin: 0; font-size: 14px; color: #15803d; font-style: italic;">"${escapeHtml(operatorNote)}"</p>
              </div>
              ` : ''}

              <div style="margin: 30px 0; padding: 20px; background: #fffbeb; border-left: 4px solid ${info.color}; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #2d3748; font-weight: bold;">Nuevo estado legal: <span style="color: ${info.color}; text-transform: uppercase;">${status.replace('_', ' ')}</span></p>
              </div>

              ${trackingUuid ? `
              <div style="text-align: center; margin-top: 35px;">
                <p style="font-size: 14px; color: #4a5568; margin-bottom: 15px;">Guarde este código QR para hacer seguimiento rápido desde cualquier dispositivo:</p>
                <img src="${qrImageUrl}" alt="QR de Seguimiento" style="width: 150px; height: 150px; border-radius: 8px; border: 2px solid #e2e8f0; padding: 5px; background: white; margin-bottom: 20px;" />
                <br />
                <a href="https://desmulta.online/seguir/${trackingUuid}" style="display: inline-block; padding: 14px 30px; background-color: #D4AF37; color: #000000; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; border-bottom: 3px solid #b38f1d;">Ver Estado del Caso</a>
              </div>
              <div style="margin-top: 25px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px;">
                <p style="font-size: 12px; color: #718096; margin: 0;">
                  <strong>Acceso Alternativo:</strong> Puede acceder en cualquier momento al portal de auto-servicio ingresando a 
                  <a href="https://desmulta.online/estado" style="color: #4299e1; text-decoration: none;"><b>desmulta.online/estado</b></a> 
                  e identificándose con su número de documento y celular de contacto.
                </p>
              </div>
              ` : ''}
              
              <div style="margin-top: 30px; padding: 15px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px;">
                <p style="margin: 0; font-size: 12px; color: #92400e; line-height: 1.6;">
                  <strong>⚠️ ¿No encuentras nuestros correos?</strong> Si este mensaje no aparece en tu bandeja de entrada, por favor revisa tu carpeta de <strong>Spam o Correo No Deseado</strong> y márcalo como "No es spam" para recibir futuras notificaciones correctamente.
                </p>
              </div>

              <p style="font-size: 13px; color: #a0aec0; margin-top: 40px; text-align: center; border-top: 1px solid #edf2f7; padding-top: 20px;">
                Desmulta — Defensa Legal y Técnica de Tránsito.
              </p>
            </div>
          </div>
        </div>
      `,
    });

    if (error) {
      logger.error(`[processCaseEmail] Error enviando email via Resend:`, error);
    } else {
      logger.info(`[processCaseEmail] Email enviado exitosamente a ${emailCiudadano}. ID: ${data?.id}`);
    }

  } catch (err) {
    logger.error(`[processCaseEmail] Error crítico:`, err);
  }
}

/**
 * Envía una notificación a Telegram cuando el estado de un caso cambia
 * desde el panel web (Kanban). Mantiene al operador informado en tiempo real.
 * Costo: 1 read (consultation) + 1 Telegram API call.
 */
async function notifyTelegramStatusChange(
  consultationId: string,
  after: admin.firestore.DocumentData,
  changedBy: 'kanban' | 'sistema' = 'kanban'
) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) return;

  const ESTADOS: Record<string, { emoji: string; label: string }> = {
    pendiente:   { emoji: '⏳', label: 'Pendiente' },
    nuevo:       { emoji: '🆕', label: 'Nuevo' },
    contactado:  { emoji: '✅', label: 'Contactado' },
    estudio:     { emoji: '🔍', label: 'En Estudio' },
    apertura:    { emoji: '🚀', label: 'Apertura' },
    radicado:    { emoji: '📋', label: 'Radicado' },
    tramite:     { emoji: '⚙️', label: 'En Trámite' },
    en_proceso:  { emoji: '⚙️', label: 'En Proceso' },
    finalizado:  { emoji: '🏁', label: 'Finalizado' },
    descartado:  { emoji: '❌', label: 'Descartado' },
  };

  const estadoInfo = ESTADOS[after.status] || { emoji: '🔄', label: after.status };
  const origen = changedBy === 'kanban' ? '🖥️ Panel Web' : '⚙️ Sistema';

  try {
    const db = admin.firestore();
    const leadSnap = await db.collection('consultations').doc(consultationId).get();
    if (!leadSnap.exists) return;

    const d = leadSnap.data()!;
    const tel = (d.contacto || '').replace(/\D/g, '');
    const wa = tel.startsWith('57') ? tel : `57${tel}`;
    const whatsappUrl = `https://wa.me/${wa}`;
    const shortId = d.shortId || consultationId.slice(0, 8);

    let operatorNote: string | undefined;
    const historyArray = after.history || after.timeline_updates || [];
    if (Array.isArray(historyArray)) {
      const lastNoteEvent = historyArray.slice().reverse().find((e: { operatorNote?: string }) => e.operatorNote);
      if (lastNoteEvent) operatorNote = lastNoteEvent.operatorNote;
    }

    const msg =
      `${estadoInfo.emoji} <b>ESTADO ACTUALIZADO — ${shortId}</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `👤 ${d.nombre || 'Sin nombre'}\n` +
      `🚗 Placa: <code>${d.placa || 'N/A'}</code>\n` +
      (d.emailContacto ? `📧 ${d.emailContacto}\n` : '') +
      `\n${estadoInfo.emoji} <b>Nuevo estado:</b> ${estadoInfo.label}\n` +
      (operatorNote ? `💬 <b>Nota del operador:</b> <i>${escapeHtml(operatorNote)}</i>\n` : '') +
      `📌 <i>Cambiado desde: ${origen}</i>`;

    const replyMarkup = buildCaseReplyMarkup(consultationId, whatsappUrl, after.status);
    const telegramMessageId = d.telegramMessageId;
    const telegramHasPhoto = d.telegramHasPhoto;

    if (telegramMessageId) {
      // ✅ EDITAR el mensaje original en vez de enviar uno nuevo
      const endpoint = telegramHasPhoto ? 'editMessageCaption' : 'editMessageText';
      const bodyPayload: Record<string, unknown> = {
        chat_id: chatId,
        message_id: telegramMessageId,
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      };

      if (telegramHasPhoto) {
        bodyPayload.caption = msg;
      } else {
        bodyPayload.text = msg;
        bodyPayload.link_preview_options = { is_disabled: true };
      }

      let editRes = await fetch(`https://api.telegram.org/bot${botToken}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      if (!editRes.ok) {
        const errorData = (await editRes.json().catch(() => ({ description: '' }))) as { description?: string };
        const desc = errorData.description || '';

        if (desc.includes('message is not modified')) {
          // Todo bien, el mensaje ya tenía este texto.
          logger.info(`[notifyTelegram] Mensaje ya actualizado para ${consultationId}`);
        } else if (desc.includes('there is no text in the message to edit')) {
          // Era una foto, reintentar con caption
          bodyPayload.caption = msg;
          delete bodyPayload.text;
          delete bodyPayload.link_preview_options;
          await fetch(`https://api.telegram.org/bot${botToken}/editMessageCaption`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyPayload),
          });
        } else if (desc.includes('there is no caption in the message to edit')) {
          // Era texto, reintentar con text
          bodyPayload.text = msg;
          delete bodyPayload.caption;
          bodyPayload.link_preview_options = { is_disabled: true };
          await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyPayload),
          });
        } else if (desc.includes('message to edit not found')) {
          // Solo si el mensaje original fue borrado por el usuario, enviamos uno nuevo (fallback real)
          const newRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: msg,
              parse_mode: 'HTML',
              reply_markup: replyMarkup,
              link_preview_options: { is_disabled: true },
            }),
          });
          if (newRes.ok) {
            const newResult = await newRes.json() as { ok: boolean; result?: { message_id: number } };
            if (newResult.result?.message_id) {
              await admin.firestore().collection('consultations').doc(consultationId).update({
                telegramMessageId: newResult.result.message_id,
              });
            }
          }
        } else {
          logger.warn(`[notifyTelegram] Error no manejado al editar: ${desc}`);
        }
      }
    } else {
      // Primera vez — enviar nuevo mensaje y guardar el ID
      const sendRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: msg,
          parse_mode: 'HTML',
          reply_markup: replyMarkup,
          link_preview_options: { is_disabled: true },
        }),
      });
      if (sendRes.ok) {
        const sendResult = await sendRes.json() as { ok: boolean; result?: { message_id: number } };
        if (sendResult.result?.message_id) {
          await admin.firestore().collection('consultations').doc(consultationId).update({
            telegramMessageId: sendResult.result.message_id,
          });
        }
      }
    }

    logger.info(`[notifyTelegramStatusChange] Mensaje Telegram actualizado para ${shortId} → ${after.status}`);
  } catch (err) {
    // No es crítico — el email ya fue enviado. Solo logueamos.
    logger.warn(`[notifyTelegramStatusChange] Error (no crítico):`, err);
  }
}

export const onCaseStatusChange = onDocumentUpdated({
  document: 'cases/{caseId}',
  region: 'us-central1',
  secrets: ['RESEND_API_KEY', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID']
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();

  // Validar si hubo cambio de estado real
  if (!before || !after || before.status === after.status) {
    return;
  }

  const consultationId = after.consultationId;

  // Ejecutar en paralelo: email al cliente + ping a Telegram para el operador
  await Promise.allSettled([
    processCaseEmail(event.params.caseId, after, false),
    consultationId && consultationId !== 'N/A'
      ? notifyTelegramStatusChange(consultationId, after, 'kanban')
      : Promise.resolve(),
  ]);
});

export const onCaseCreated = onDocumentCreated({
  document: 'cases/{caseId}',
  region: 'us-central1',
  secrets: ['RESEND_API_KEY']
}, async (event) => {
  const after = event.data?.data();
  if (!after) return;

  await processCaseEmail(event.params.caseId, after, true);
});

export const onConsultationStatusChange = onDocumentUpdated({
  document: 'consultations/{consultationId}',
  region: 'us-central1',
  secrets: ['RESEND_API_KEY', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID']
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();

  if (!before || !after || before.status === after.status) return;

  const consultationId = event.params.consultationId;

  // Evitar notificaciones duplicadas:
  // Si el estado pertenece a un Caso Legal (ej: apertura, en_proceso, radicado, terminado...)
  // ignoramos el trigger aquí porque onCaseStatusChange enviará la notificación
  // Solo disparamos en etapas tempranas exclusivas del Lead.
  const leadOnlyStatuses = ['pendiente', 'nuevo', 'contactado', 'estudio', 'descartado'];
  if (!leadOnlyStatuses.includes(after.status.toLowerCase())) {
    logger.info(`[onConsultationStatusChange] Ignorando status '${after.status}' para evitar duplicados. Se maneja en onCaseStatusChange.`);
    return;
  }

  const fakeAfterForLead = {
    ...after,
    consultationId,
  };

  // Enviar email al cliente y notificar al operador en Telegram para los cambios de estado iniciales.
  await Promise.allSettled([
    processCaseEmail(consultationId, fakeAfterForLead, false, true),
    notifyTelegramStatusChange(consultationId, after, 'kanban'),
  ]);
});
