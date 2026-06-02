import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';
import { logger } from '@/lib/logger/security-logger';

// Helper para escapar caracteres HTML en mensajes de Telegram
function escapeHtml(text: string): string {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// 🛡️ DEVSECOPS: Tolerancia a Fallos (Exponential Backoff)
// Protege el Data Bridge contra Rate Limits de Telegram (HTTP 429)
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  let delay = 1000; // 1 segundo base

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Aislamiento del timeout: Un AbortController nuevo por cada intento
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s por intento

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);

      // Si fue exitoso o es un error definitivo (no 429), retornamos inmediatamente
      if (response.ok || response.status !== 429) {
        return response;
      }

      // Interceptación de Rate Limit (HTTP 429)
      const retryAfter = response.headers.get('Retry-After');
      const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : delay;

      logger.warn(
        `[telegram-service] Límite de Tasa (429) detectado. Pausando hilo ${waitTime}ms (Intento ${attempt + 1}/${maxRetries})`
      );

      // Pausa no bloqueante del hilo de Node.js
      await new Promise((resolve) => setTimeout(resolve, waitTime));

      delay *= 2; // Retroceso exponencial (1s, 2s, 4s...)
    } catch (error) {
      clearTimeout(timeoutId);
      // Fallo de red severo (DNS, AbortError por timeout)
      if (attempt === maxRetries - 1) throw error;

      logger.warn(`[telegram-service] Falla de red transitoria. Reintentando en ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }

  throw new Error(
    `[telegram-service] Falla catastrófica en el Data Bridge tras ${maxRetries} reintentos.`
  );
}

export async function sendTelegramNotification(
  docId: string,
  evidenceUrl?: string | null
): Promise<boolean> {
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
    const activeEvidenceUrl = evidenceUrl || data?.evidenceUrl;

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
      activeEvidenceUrl && !isSimit
        ? `\n🖼️ <b>Evidencia SIMIT:</b> <a href="${escapeHtml(activeEvidenceUrl)}">Ver Captura</a>`
        : '';

    // Preparación de WhatsApp (MANDATO-FILTRO: Automatización)
    const numeroLimpio = (data?.contacto || '').replace(/\D/g, '');
    const telefonoWa = numeroLimpio.startsWith('57') ? numeroLimpio : `57${numeroLimpio}`;
    const mensajeWa = `Hola ${data?.nombre}, soy analista de Desmulta. Recibimos tu solicitud (Ref: ${shortId}) para la placa ${data?.placa || 'en trámite'}. Te cuento que...`;
    const urlWhatsApp = `https://wa.me/${telefonoWa}?text=${encodeURIComponent(mensajeWa)}`;

    // --- Bloque de Dictamen Heurístico v7.4.3 ---
    const ocrData = data?.ocrData;
    let dictamenHtml = '';

    if (ocrData) {
      const emoji = ocrData.isViable ? '🟢' : '🔴';
      dictamenHtml = `\n⚙️ <b>Dictamen Heurístico:</b> ${emoji} <b>${ocrData.status}</b>\n• <i>${escapeHtml(ocrData.technicalDictum)}</i>\n`;
    }

    const message = `<b>${headerTitle}</b>
━━━━━━━━━━━━━━━━━━━━

👤 <b>Cliente:</b> ${escapeHtml(data?.nombre)}
🆔 <b>Ref:</b> <code>${escapeHtml(shortId)}</code>
🪪 <b>Cédula:</b> <code>${escapeHtml(data?.cedula)}</code>
🚗 <b>Placa:</b> <code>${escapeHtml(data?.placa || 'N/A')}</code>
📱 <b>WhatsApp:</b> <a href="${urlWhatsApp}">${escapeHtml(data?.contacto)}</a>
${dictamenHtml}${evidenceSection}
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
    let requestOptions: RequestInit = {};

    if (activeEvidenceUrl) {
      telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;

      // 🌉 DATA BRIDGE: Descarga efímera a memoria RAM
      // Evita que Telegram dependa de la URL pública de Vercel
      const imgFetch = await fetch(activeEvidenceUrl);
      if (!imgFetch.ok) {
        throw new Error(`[Data Bridge] No se pudo leer el Blob de Vercel: ${imgFetch.statusText}`);
      }
      const imgBuffer = await imgFetch.arrayBuffer();

      // Construcción del payload físico (multipart/form-data)
      const formData = new FormData();
      formData.append('chat_id', TELEGRAM_CHAT_ID);
      // Forzamos el tipo Blob estándar compatible con Next.js 15
      formData.append('photo', new Blob([imgBuffer], { type: 'image/jpeg' }), 'evidencia.jpg');
      formData.append('caption', message);
      formData.append('parse_mode', 'HTML');
      if (replyMarkup) {
        formData.append('reply_markup', JSON.stringify(replyMarkup));
      }

      requestOptions = {
        method: 'POST',
        body: formData,
        // DevSecOps: NO setear 'Content-Type' aquí.
        // fetch() calculará automáticamente el boundary del multipart.
      };
    } else {
      // Payload estándar de texto (Fallback)
      requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'HTML',
          reply_markup: replyMarkup,
        }),
      };
    }

    // Ejecución Síncrona Blindada hacia Telegram
    const telegramResponse = await fetchWithRetry(telegramApiUrl, requestOptions);

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

/**
 * sendTelegramPushActivated — Notifica al equipo cuando un usuario
 * activa exitosamente las notificaciones push desde la web.
 */
export async function sendTelegramPushActivated(docId: string): Promise<boolean> {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return false;

  try {
    getAdminApp();
    const db = getFirestore();
    const docSnap = await db.collection('consultations').doc(docId).get();

    if (!docSnap.exists) return false;

    const data = docSnap.data();
    const shortId = data?.shortId || 'SIN-REF';
    const nombre = data?.nombre || 'Cliente';

    const message = `🔔 <b>Notificaciones Push ACTIVADAS</b>
━━━━━━━━━━━━━━━━━━━━
El cliente <b>${escapeHtml(nombre)}</b> (Ref: <code>${escapeHtml(shortId)}</code>) ha suscrito su dispositivo con éxito.

🚀 Ya puedes enviarle dictámenes en tiempo real desde el Centro de Mando.
━━━━━━━━━━━━━━━━━━━━`;

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    return true;
  } catch (err) {
    logger.error('[telegram-service] Error notificando activación de Push:', err);
    return false;
  }
}
