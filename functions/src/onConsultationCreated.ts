import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { Resend } from 'resend';
import { buildCaseReplyMarkup } from './telegramWebhook';
import * as QRCode from 'qrcode';

/**
 * Sanitiza texto para uso seguro en mensajes HTML de Telegram.
 * Previene inyección de HTML en el chat del operador.
 */
function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Trigger: onConsultationCreated
 * Se dispara cuando entra una nueva consulta (Web o SIMIT Capture).
 * 1. Envía notificación de email al ciudadano (Bienvenida + Análisis Técnico).
 * 2. Envía notificación a Telegram para los analistas (con foto si existe).
 * 3. Gestiona la purga del Vercel Blob de evidencia.
 */
export const onConsultationCreated = onDocumentCreated({
  document: 'consultations/{id}',
  region: 'us-central1',
  timeoutSeconds: 120,
  secrets: ['RESEND_API_KEY', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'INTERNAL_API_SECRET']
}, async (event) => {
  const data = event.data?.data();
  if (!data) return;

  const docId = event.params.id;
  const shortId = data.shortId || 'SIN-REF';
  const emailCiudadano = data.emailContacto || data.email;
  const trackingUuid = data.trackingUuid;
  const evidenceUrl = data.evidenceUrl;
  const ocrData = data.ocrData;
  const db = admin.firestore();

  // 🛡️ IDEMPOTENCIA (v8.9.2)
  const consultationRef = db.collection('consultations').doc(docId);

  // Verificación atómica: solo procesar si no está ya en proceso o completado
  let yaFueProcesado = false;
  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(consultationRef);
    const d = snap.data();
    if (!d) return;

    const status = d.processingStatus;
    if (status === 'processing' || status === 'done') {
      yaFueProcesado = true;
      return;
    }

    transaction.update(consultationRef, { processingStatus: 'processing' });
  });

  if (yaFueProcesado) {
    logger.info(`[onConsultationCreated] ${docId} ya en proceso o completado — saltando.`);
    return;
  }

  // 1. Email de Bienvenida / Confirmación con Dictamen Técnico
  if (emailCiudadano) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      // Humanizar nombre (para casos SIMIT que no tienen nombre real)
      const isSimitCapture = data.nombre && data.nombre.startsWith('VÍA CAPTURA');
      const nombreUsuario = isSimitCapture ? 'conductor' : data.nombre;
      const saludoInicial = isSimitCapture 
        ? `¡Hola! 👋 Te damos la bienvenida a Desmulta.` 
        : `¡Hola, ${nombreUsuario}! 👋 Te damos la bienvenida a Desmulta.`;

      let qrImageUrl = '';
      if (trackingUuid) {
        // En lugar de enviar un base64 que es bloqueado por Gmail, usamos la ruta API pública.
        qrImageUrl = `https://desmulta.online/api/qr?data=${encodeURIComponent(`https://desmulta.online/seguir/${trackingUuid}`)}`;
      }

      await resend.emails.send({
        from: 'Desmulta Gestión <gestion@desmulta.online>',
        replyTo: 'contactodesmulta@protonmail.com',
        to: emailCiudadano,
        subject: `✅ Consulta Recibida: ${shortId} (${data.placa || 'Trámite'})`,
        html: `
          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2c3e50; line-height: 1.6; background-color: #f8f9fa; padding: 20px;">
            <div style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
              <div style="text-align: center; padding: 25px; background: #000000; border-bottom: 4px solid #D4AF37;">
                 <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px;">DES<span style="color: #D4AF37;">MULTA</span></h1>
                 <p style="color: #a0a0a0; font-size: 12px; margin: 5px 0 0 0; text-transform: uppercase; letter-spacing: 2px;">Defensa Legal de Tránsito</p>
              </div>
              
              <div style="padding: 40px 30px;">
                <h2 style="color: #000000; font-size: 22px; margin-top: 0;">${saludoInicial}</h2>
                <p style="font-size: 16px; color: #4a5568;">
                  Queremos confirmarte que hemos recibido exitosamente tu solicitud de revisión y ya hemos comenzado a procesar tu caso para la placa <strong style="background: #edf2f7; padding: 4px 8px; border-radius: 6px; color: #2d3748; border: 1px solid #e2e8f0;">${data.placa || 'en trámite'}</strong>.
                </p>
                
                <p style="font-size: 15px; color: #4a5568;">
                  Sabemos que los temas de tránsito, comparendos y fotomultas pueden generar mucha frustración y estrés. <strong>Queremos darte la tranquilidad de que estás en el lugar correcto y has dado el paso adecuado</strong>. A partir de este momento, tu caso cuenta con la atención y garantía de nuestro equipo de expertos legales y técnicos. No estás solo en este proceso.
                </p>
                
                <div style="margin: 30px 0; padding: 25px; background: #f0f7ff; border-left: 4px solid #3182ce; border-radius: 0 8px 8px 0;">
                  <p style="margin: 0; font-size: 13px; color: #2b6cb0; text-transform: uppercase; letter-spacing: 0.1em; font-weight: bold; margin-bottom: 12px;">📊 Estado Actual de tu Consulta</p>
                  <p style="margin: 0; font-size: 16px; color: #2d3748; line-height: 1.5;">Tu caso y la evidencia han sido recibidos de manera segura. Nuestro sistema ha agendado tu expediente para una revisión humana detallada, con el fin de encontrar cualquier oportunidad de exoneración, caducidad o prescripción a tu favor.</p>
                </div>

                <h3 style="color: #000000; font-size: 18px; margin-top: 35px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">¿Qué sigue ahora?</h3>
                
                <ul style="list-style-type: none; padding: 0; margin: 20px 0;">
                  <li style="margin-bottom: 15px; padding-left: 30px; position: relative;">
                    <span style="position: absolute; left: 0; top: 0; color: #D4AF37; font-size: 18px;">✅</span>
                    <strong>1. Recepción y Verificación:</strong> (¡Completado!) Tu caso ya está seguro en nuestro sistema.
                  </li>
                  <li style="margin-bottom: 15px; padding-left: 30px; position: relative;">
                    <span style="position: absolute; left: 0; top: 0; color: #D4AF37; font-size: 18px;">🔍</span>
                    <strong>2. Análisis Profundo:</strong> Un especialista humano revisará los detalles técnicos y legales para estructurar la mejor defensa.
                  </li>
                  <li style="margin-bottom: 15px; padding-left: 30px; position: relative;">
                    <span style="position: absolute; left: 0; top: 0; color: #D4AF37; font-size: 18px;">📱</span>
                    <strong>3. Contacto:</strong> Te escribiremos por WhatsApp para darte el veredicto final y el plan de acción.
                  </li>
                </ul>
                
                <div style="margin: 40px 0; text-align: center; background: #f8fafc; padding: 25px; border-radius: 12px; border: 1px dashed #cbd5e1;">
                  <p style="font-size: 13px; color: #64748b; margin-top: 0; text-transform: uppercase; font-weight: bold;">Tu ID de Radicado Único</p>
                  <p style="font-size: 24px; font-family: monospace; color: #000000; margin: 10px 0; letter-spacing: 2px;"><b>${shortId}</b></p>
                  
                  ${trackingUuid ? `<div style="margin-top: 20px;">
                    ${qrImageUrl ? `<div style="text-align:center;margin:20px 0"><img src="${qrImageUrl}" alt="QR Seguimiento" style="width:150px;height:150px;border-radius:8px;border:2px solid #e2e8f0;background:white;padding:5px;" /></div>` : ''}
                    <a href="https://desmulta.online/seguir/${trackingUuid}" style="background: #000000; color: #D4AF37; padding: 14px 32px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold; text-transform: uppercase; font-size: 13px; letter-spacing: 0.05em; border: 1px solid #D4AF37;">Ver Estado en Vivo</a>
                  </div>` : ''}

                  <div style="margin-top: 25px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
                    <p style="font-size: 12px; color: #64748b; margin: 0; line-height: 1.5;">
                      <strong>Acceso Seguro Institucional:</strong> Recuerde que puede acceder al estado de su expediente en cualquier momento desde 
                      <a href="https://desmulta.online/estado" style="color: #3182ce; text-decoration: none;"><b>desmulta.online/estado</b></a> 
                      usando su número de cédula y celular de contacto para validación de identidad.
                    </p>
                  </div>
                </div>

                <p style="font-size: 15px; color: #4a5568; margin-top: 30px;">
                  Gracias por confiar en nosotros. Mantente atento a tu celular, nos pondremos en contacto pronto.
                </p>
                <p style="font-size: 15px; color: #4a5568; font-weight: bold;">
                  Atentamente,<br>
                  El Equipo de Desmulta
                </p>
              </div>

              <div style="background: #000000; padding: 20px; text-align: center;">
                <p style="font-size: 12px; color: #a0a0a0; margin: 0; line-height: 1.5;">
                  <strong>Desmulta.online</strong> | Gestión Digital para el Ciudadano.<br>
                  Este es un canal de comunicación institucional seguro.<br>
                  Por favor, no respondas directamente a este correo automatizado.
                </p>
              </div>
            </div>
          </div>
        `
      });
      await db.collection('consultations').doc(docId).update({
        welcomeEmailSent: true
      });
      logger.info(`[onConsultationCreated] Email enviado a ${emailCiudadano}`);
    } catch (err) {
      logger.error(`[onConsultationCreated] Error enviando email:`, err);
    }
  }

  // 2. Notificación Telegram a Analistas
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (botToken && chatId) {
    try {
      let telegramMsgId: number | null = null;
      const isSimit = data.fuente === 'simit_capture';
      const headerTitle = isSimit ? `🚨 NUEVA CAPTURA SIMIT (${shortId})` : `💼 NUEVO PROSPECTO (${shortId})`;
      
      const numeroLimpio = (data.contacto || '').replace(/\D/g, '');
      const telefonoWa = numeroLimpio.startsWith('57') ? numeroLimpio : `57${numeroLimpio}`;
      const urlWhatsApp = `https://wa.me/${telefonoWa}`;

      let message = `<b>${headerTitle}</b>\n━━━━━━━━━━━━━━━━━━━━\n\n`;
      message += `👤 <b>Cliente:</b> ${escapeHtml(data.nombre)}\n`;
      if (data.cedula && data.cedula !== 'SIMIT-CAPTURA') {
        message += `🪪 <b>Cédula:</b> <code>${escapeHtml(String(data.cedula))}</code>\n`;
      }
      message += `🆔 <b>Ref:</b> <code>${shortId}</code>\n`;
      message += `🚗 <b>Placa:</b> <code>${data.placa || 'N/A'}</code>\n`;
      message += `📱 <b>WhatsApp:</b> <a href="${urlWhatsApp}">${data.contacto}</a>\n`;

      if (!isSimit) {
        message += `\n📋 <b>Datos del Caso:</b>\n`;
        if (data.emailContacto) message += `📧 <b>Email:</b> ${data.emailContacto}\n`;
        if (data.ciudad) message += `📍 <b>Ciudad:</b> ${data.ciudad}\n`;
        if (data.tipoInfraccion) message += `🔸 <b>Tipo:</b> ${data.tipoInfraccion}\n`;
        if (data.antiguedad) message += `⏳ <b>Antigüedad:</b> ${data.antiguedad}\n`;
        if (data.estadoCoactivo) message += `⚖️ <b>Coactivo:</b> ${data.estadoCoactivo}\n`;
        if (data.requiresOperatorFiling) message += `📝 <b>Radicación Operador:</b> SÍ\n`;
      }
      
      // ── 1.5 Buscar Datos Financieros y Dictamen en Leads (Delay para evitar Race Condition)
      let leadDeuda = 0;
      let leadMultas: Array<{ comparendo?: string; fecha?: string; valor?: number }> = [];
      if (data.cedula && data.cedula !== 'SIMIT-CAPTURA') {
        try {
          const leadSnap = await db.collection('leads')
            .where('cedula', '==', data.cedula)
            .orderBy('ultima_actualizacion', 'desc')
            .limit(1)
            .get();
          if (!leadSnap.empty) {
            const lData = leadSnap.docs[0].data();
            leadDeuda = lData.total_deuda_acumulada || 0;
            leadMultas = lData.multas_registradas || [];
          }
        } catch (err) {
          logger.warn('[onConsultationCreated] Error consultando lead:', err);
        }
      }

      if (ocrData || leadMultas.length > 0) {
        if (ocrData) {
          message += `\n⚙️ <b>Dictamen Técnico (OCR Actual):</b>\n`;
          message += `<b>Estado:</b> ${ocrData.isViable ? '🟢' : '🔴'} ${ocrData.status}\n`;
          if (ocrData.technicalDictum) {
            message += `<i>"${escapeHtml(ocrData.technicalDictum)}"</i>\n\n`;
          }
        }
        
        if (leadMultas.length > 0) {
          message += `\n🗄️ <b>Historial SIMIT (Expediente Único):</b>\n`;
          message += `💰 <b>Total Deuda:</b> $${leadDeuda.toLocaleString('es-CO')}\n`;
          message += `🚨 <b>Multas (${leadMultas.length}):</b>\n`;
          leadMultas.slice(0, 5).forEach((m, i) => {
            message += `   • ${m.comparendo || 'Desconocido'} (${m.fecha || 'Sin fecha'}) - $${(m.valor || 0).toLocaleString('es-CO')}\n`;
          });
          if (leadMultas.length > 5) message += `   • ...y ${leadMultas.length - 5} más\n`;
        } else if (ocrData) {
          // Intentar parseo de emergencia del rawText
          const rawTotal = ocrData.rawText?.match(/Total\s*:?\s*\$?\s*([\d\.]+)/i)?.[1]?.replace(/\./g, '');
          if (rawTotal && !isNaN(Number(rawTotal))) {
             message += `💰 <b>Total Detectado OCR:</b> $${Number(rawTotal).toLocaleString('es-CO')}\n`;
          }
          if (ocrData.extractedId) message += `🆔 <b>Cédula OCR:</b> <code>${ocrData.extractedId}</code>\n`;
        }
      }

      const replyMarkup = buildCaseReplyMarkup(docId, urlWhatsApp);

      if (evidenceUrl) {
        const response = await fetch(evidenceUrl);
        const buffer = await response.arrayBuffer();
        
        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append('photo', new Blob([buffer]), 'evidencia.jpg');
        formData.append('caption', message);
        formData.append('parse_mode', 'HTML');
        formData.append('reply_markup', JSON.stringify(replyMarkup));

        const tgResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
          method: 'POST',
          body: formData
        });

        if (!tgResponse.ok) {
          const errText = await tgResponse.text();
          logger.error(`[onConsultationCreated] Error de Telegram API (sendPhoto): ${tgResponse.status} - ${errText}`);
          throw new Error(`Telegram API Error (Photo): ${tgResponse.status}`);
        }
        // Guardar message_id del mensaje con foto para poder editarlo después
        const tgPhotoResult = await tgResponse.json() as { ok: boolean; result?: { message_id: number } };
        telegramMsgId = tgPhotoResult.result?.message_id ?? null;
      } else {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML',
            reply_markup: replyMarkup,
            link_preview_options: { is_disabled: true }
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          logger.error(`[onConsultationCreated] Error de Telegram API (sendMessage): ${response.status} - ${errText}`);
          throw new Error(`Telegram API Error: ${response.status}`);
        }
        // Guardar message_id del mensaje de texto para poder editarlo después
        const tgMsgResult = await response.json() as { ok: boolean; result?: { message_id: number } };
        telegramMsgId = tgMsgResult.result?.message_id ?? null;
      }
      
      await db.collection('consultations').doc(docId).update({
        telegramStatus: 'sent',
        notifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        telegramMessageId: telegramMsgId ?? null,
        telegramHasPhoto: !!evidenceUrl,
      });

    } catch (err) {
      logger.error(`[onConsultationCreated] Error Telegram:`, err);
      // 🛡️ MANDATO-FILTRO: Marcar como 'failed' para que cronRetryNotifications
      // pueda reintentarlo. Sin esto, el status queda en 'processing' para siempre
      // y la consulta nunca llega al operador.
      try {
        await db.collection('consultations').doc(docId).update({
          telegramStatus: 'failed',
          telegramError: err instanceof Error ? err.message : String(err),
        });
      } catch (updateErr) {
        logger.error('[onConsultationCreated] No se pudo marcar como failed:', updateErr);
      }
    }
  }

  // 3. Purga de Vercel Blob (v8.1.0)
  // 🛡️ REPARACIÓN: Vercel Blob SDK no funciona fuera de Vercel. 
  // Usamos un túnel API interno para purgar la evidencia tras enviarla a Telegram.
  if (evidenceUrl && data.fuente !== 'simit_capture') {
    const internalSecret = process.env.INTERNAL_API_SECRET;
    if (internalSecret) {
      try {
        const response = await fetch('https://desmulta.online/api/internal/purge-blob', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-secret': internalSecret,
          },
          body: JSON.stringify({ url: evidenceUrl }),
        });

        if (response.ok) {
          logger.info(`[onConsultationCreated] Blob purgado vía API: ${evidenceUrl}`);
        } else {
          const errorText = await response.text();
          logger.error(`[onConsultationCreated] Fallo al purgar Blob (${response.status}): ${errorText}`);
        }
      } catch (err) {
        logger.error(`[onConsultationCreated] Error de red purgando Blob:`, err);
      }
    } else {
      logger.warn('[onConsultationCreated] INTERNAL_API_SECRET no configurado, el blob no se purgará.');
    }
  }

  // Marcar como completado para futuros retries
  await db.collection('consultations').doc(docId).update({
    processingStatus: 'done',
    telegramStatus: 'sent',
    welcomeEmailSent: true,
  });
});
