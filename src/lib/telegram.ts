import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';
import { logger } from '@/lib/logger/security-logger';

// Helper para escapar caracteres HTML en mensajes de Telegram
function escapeHtml(text: string): string {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function sendTelegramNotification(docId: string): Promise<boolean> {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    if (process.env.NODE_ENV === 'development') {
      logger.error('[telegram-service] Variables de Telegram no configuradas.');
    }
    return false;
  }

  try {
    getAdminApp();
    const db = getFirestore();
    const docRef = db.collection('consultations').doc(docId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      logger.error('[telegram-service] No existe el documento de consulta.', { docId });
      return false;
    }

    const data = docSnap.data();
    const isSimit = data?.fuente === 'simit_capture';

    // Idempotencia: Si la notificación ya fue enviada, no hacer nada.
    if (data?.telegramStatus === 'sent') {
      return true;
    }

    const shortId = data?.shortId || 'SIN-REF';
    const headerTitle = isSimit
      ? `🚨 NUEVA CAPTURA SIMIT (${shortId})`
      : `💼 NUEVO PROSPECTO (${shortId})`;

    // Sección de Evidencia (Si existe imagen y no es flujo SIMIT)
    const evidenceSection =
      data?.evidenceUrl && !isSimit
        ? `\n🖼️ <b>Evidencia SIMIT:</b> <a href="${escapeHtml(data.evidenceUrl)}">Ver Captura</a>`
        : '';

    // Preparación de WhatsApp (MANDATO-FILTRO: Automatización)
    const numeroLimpio = (data?.contacto || '').replace(/\D/g, '');
    const telefonoWa = numeroLimpio.startsWith('57') ? numeroLimpio : `57${numeroLimpio}`;
    const mensajeWa = `Hola ${data?.nombre}, soy analista de Desmulta. Recibimos tu solicitud (Ref: ${shortId}) para la placa ${data?.placa || 'en trámite'}. Te cuento que...`;
    const urlWhatsApp = `https://wa.me/${telefonoWa}?text=${encodeURIComponent(mensajeWa)}`;

    const message = `<b>${headerTitle}</b>
━━━━━━━━━━━━━━━━━━━━

👤 <b>Cliente:</b> ${escapeHtml(data?.nombre)}
🆔 <b>Ref:</b> <code>${escapeHtml(shortId)}</code>
🪪 <b>Cédula:</b> <code>${escapeHtml(data?.cedula)}</code>
🚗 <b>Placa:</b> <code>${escapeHtml(data?.placa || 'N/A')}</code>
📱 <b>WhatsApp:</b> <a href="${urlWhatsApp}">${escapeHtml(data?.contacto)}</a>
${evidenceSection}
📌 <b>Análisis de Viabilidad</b>
• <b>Antigüedad:</b> ${escapeHtml(data?.antiguedad)}
• <b>Tipo Multa:</b> ${escapeHtml(data?.tipoInfraccion)}
• <b>Coactivo:</b> ${escapeHtml(data?.estadoCoactivo)}

📌 <b>Detalles del Caso</b>
• <b>ID Sistema:</b> <code>${escapeHtml(docId)}</code>
• <b>Fuente:</b> ${escapeHtml(data?.fuente || 'Web')}
• <b>Estado:</b> 🟡 <i>Pendiente de Revisión</i>

📅 <b>Recibido:</b> ${escapeHtml(new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }))}
━━━━━━━━━━━━━━━━━━━━
💡 <i>Usa el botón de abajo para responder instantáneamente.</i>`;

    const replyMarkup = {
      inline_keyboard: [
        [
          {
            text: '🟢 Responder por WhatsApp',
            url: urlWhatsApp,
          },
        ],
      ],
    };

    let telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    let payloadData: Record<string, unknown> = {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    };

    if (data?.evidenceUrl) {
      telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
      payloadData = {
        chat_id: TELEGRAM_CHAT_ID,
        photo: data.evidenceUrl,
        caption: message,
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

    const telegramResponse = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadData),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const telegramResponseData = (await telegramResponse.json()) as Record<string, unknown>;

    if (!telegramResponse.ok) {
      if (process.env.NODE_ENV === 'development') {
        logger.error('[telegram-service] Telegram API Error:', {
          details: telegramResponseData,
        });
      }
      await docRef.update({
        telegramStatus: 'failed',
        telegramError: JSON.stringify(telegramResponseData).slice(0, 200),
      });
      return false;
    }

    // ✅ Marcar como entregado: idempotencia garantizada
    await docRef.update({
      telegramStatus: 'sent',
      notifiedAt: Timestamp.now(),
    });

    return true;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    logger.error('[telegram-service] Error crítico:', { error: message });
    return false;
  }
}
