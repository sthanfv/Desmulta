import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';
import { logger } from '@/lib/logger/security-logger';
import { validateWebhookUrl } from '@/lib/security/ssrf-guard';

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

      // Interceptación de Rate Limit (HTTP 429) con Jitter
      const retryAfter = response.headers.get('Retry-After');
      const baseWaitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : delay;
      const jitter = Math.floor(Math.random() * 1000); // Aleatoriedad de 0 a 999ms
      const waitTime = baseWaitTime + jitter;

      logger.warn(
        `[telegram-service] Límite de Tasa (429) detectado. Pausando hilo ${waitTime}ms (Jitter: ${jitter}ms, Intento ${attempt + 1}/${maxRetries})`
      );

      // Pausa no bloqueante del hilo de Node.js
      await new Promise((resolve) => setTimeout(resolve, waitTime));

      delay *= 2; // Retroceso exponencial (1s, 2s, 4s...)
    } catch (error) {
      clearTimeout(timeoutId);
      // Fallo de red severo (DNS, AbortError por timeout)
      if (attempt === maxRetries - 1) throw error;

      const jitter = Math.floor(Math.random() * 500);
      const waitTime = delay + jitter;
      logger.warn(
        `[telegram-service] Falla de red transitoria. Reintentando en ${waitTime}ms (Jitter: ${jitter}ms)`
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime));
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

    // 🛡️ F-02 DEVSECOPS: Enmascarar PII antes de enviar a Telegram (canal no E2E).
    // Telegram no garantiza cifrado extremo a extremo en bots. Misma técnica que /api/abandonment.
    const nombreMask = data?.nombre
      ? data.nombre
          .split(' ')
          .map((p: string) => (p.length > 0 ? p[0] + '*'.repeat(Math.max(0, p.length - 1)) : ''))
          .join(' ')
      : 'Cliente';
    const placaMask = data?.placa ? `***${String(data.placa).slice(-2)}` : 'N/A';

    const mensajeWa = `Hola ${nombreMask}, soy analista de Desmulta. Recibimos tu solicitud (Ref: ${shortId}) para la placa ${placaMask}. Te cuento que...`;
    const urlWhatsApp = `https://wa.me/${telefonoWa}?text=${encodeURIComponent(mensajeWa)}`;

    // --- Bloque de Dictamen Heurístico v7.4.3 ---
    const ocrData = data?.ocrData;
    let dictamenHtml = '';

    if (ocrData) {
      const emoji = ocrData.isViable ? '🟢' : '🔴';
      dictamenHtml = `\n⚙️ <b>Dictamen Heurístico:</b> ${emoji} <b>${ocrData.status}</b>\n• <i>${escapeHtml(ocrData.technicalDictum)}</i>\n`;
    }

    // 🛡️ FIX HTML INJECTION (DoS): Telegram bot arroja 400 Bad Request si el HTML es malformado.
    // Usamos el helper escapeHtml() para sanitizar nombreMask y placaMask en caso de que vengan
    // con <, >, & del frontend.
    const message = `<b>${headerTitle}</b>
━━━━━━━━━━━━━━━━━━━━

👤 <b>Cliente:</b> ${escapeHtml(nombreMask)}
🆔 <b>Ref:</b> <code>${escapeHtml(shortId)}</code>
🪪 <b>Cédula:</b> 🔒 [Protegida por E2EE]
🚗 <b>Placa:</b> <code>${escapeHtml(placaMask)}</code>
📱 <b>WhatsApp:</b> <a href="${escapeHtml(urlWhatsApp)}">${escapeHtml(data?.contacto)}</a>
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
💡 <i>Usa los botones para gestionar este caso.</i>`;

    // FIX: El fallback era .vercel.app, causando errores de sesión CORS cuando
    // el operador abría el enlace desde Telegram. Se establece el dominio de producción real.
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://desmulta.online';
    const adminUrl = `${baseUrl}/admin?search=${encodeURIComponent(docId)}`;

    const replyMarkup = {
      inline_keyboard: [
        [
          {
            text: '🟢 Responder por WhatsApp',
            url: urlWhatsApp,
          },
        ],
        [
          {
            text: '🔓 Ver Datos Sensibles (PII)',
            url: adminUrl,
          },
        ],
      ],
    };

    let telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    let requestOptions: RequestInit = {};

    if (activeEvidenceUrl) {
      telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;

      // Validación SSRF antes de hacer fetch
      await validateWebhookUrl(activeEvidenceUrl);

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

/**
 * sendTelegramPushError — Notifica al equipo administrador cuando una notificación
 * push falla de manera crítica (token huérfano, revocado, o error de red).
 * Garantiza que las fallas no queden ocultas en la base de datos.
 */
export async function sendTelegramPushError(
  docId: string,
  statusCode: string,
  reason: string,
  shortId?: string
): Promise<boolean> {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return false;

  try {
    const errorTypeMap: Record<string, string> = {
      no_token: '📵 USUARIO INCOMUNICADO (Sin Permisos)',
      token_invalid: '🗑️ TOKEN MUERTO (Rechazado por FCM)',
      error: '⚠️ FALLO DE ENTREGA (Error de Red/FCM)',
    };

    const displayId = shortId || docId;
    const errorType = errorTypeMap[statusCode] || '❌ ERROR DESCONOCIDO';

    const message = `🚨 <b>ALERTA DE SISTEMA: FALLO DE NOTIFICACIÓN PUSH</b>
━━━━━━━━━━━━━━━━━━━━
<b>Caso/Consulta:</b> <code>${escapeHtml(displayId)}</code>
<b>Tipo de Fallo:</b> ${errorType}

<b>Diagnóstico Técnico:</b>
<code>${escapeHtml(reason)}</code>

⚠️ <i>El operador debe comunicarse con el usuario por un canal alternativo (Ej. WhatsApp o Correo) y solicitarle que vuelva a autorizar notificaciones en la página de seguimiento.</i>
━━━━━━━━━━━━━━━━━━━━`;

    // Fire-and-forget: No esperamos respuesta para no bloquear flujos
    fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }),
    }).catch((err) => {
      logger.error('[telegram-service] Fallo enviando alerta de error Push a Telegram', err);
    });

    return true;
  } catch (err) {
    logger.error('[telegram-service] Error construyendo alerta de error Push:', err);
    return false;
  }
}

/**
 * sendTelegramCronSuccess — Notifica al equipo cuando el Cron Job actualiza
 * la Tasa de Usura en la base de datos (Firestore).
 */
export async function sendTelegramCronSuccess(rate: number): Promise<boolean> {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_DEV_CHAT_ID } = process.env;
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_DEV_CHAT_ID) return false;

  try {
    const message = `🤖 <b>CRON JOB: TASA DE USURA ACTUALIZADA</b>
━━━━━━━━━━━━━━━━━━━━
📅 <b>Fecha de Sincronización:</b> ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}
📊 <b>Nueva Tasa E.A.:</b> <code>${(rate * 100).toFixed(2)}%</code>

✅ Guardado exitosamente en Firestore. El Motor Go utilizará esta tasa a partir de este instante.
━━━━━━━━━━━━━━━━━━━━`;

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_DEV_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }),
    });
    return true;
  } catch (err) {
    logger.error('[telegram-service] Error enviando éxito de Cron:', err);
    return false;
  }
}

/**
 * sendTelegramCronError — Notifica al equipo si el Cron Job falla.
 */
export async function sendTelegramCronError(errorMsg: string): Promise<boolean> {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_DEV_CHAT_ID } = process.env;
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_DEV_CHAT_ID) return false;

  try {
    const message = `🚨 <b>ALERTA DE SISTEMA: CRON JOB FALLIDO</b>
━━━━━━━━━━━━━━━━━━━━
<b>Proceso:</b> Sincronización de Tasa de Usura
<b>Error:</b> <code>${escapeHtml(errorMsg)}</code>

⚠️ <i>Se requiere intervención manual. Por favor actualiza la tasa directamente desde el panel de administración o verifica la conexión con la API externa.</i>
━━━━━━━━━━━━━━━━━━━━`;

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_DEV_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }),
    });
    return true;
  } catch (err) {
    logger.error('[telegram-service] Error enviando alerta de Cron:', err);
    return false;
  }
}

/**
 * sendTelegramAgentAlert — Notifica al equipo de ingeniería si el motor
 * conversacional de IA o la API de Google tienen una falla crítica.
 */
export async function sendTelegramAgentAlert(
  errorMsg: string,
  traceId: string
): Promise<boolean> {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_DEV_CHAT_ID, TELEGRAM_CHAT_ID } = process.env;
  const targetChatId = TELEGRAM_DEV_CHAT_ID || TELEGRAM_CHAT_ID;
  if (!TELEGRAM_BOT_TOKEN || !targetChatId) return false;

  try {
    const message = `🚨 <b>ALERTA DE SISTEMA: MOTOR DE IA / ASISTENTE</b>
━━━━━━━━━━━━━━━━━━━━
<b>Trace ID:</b> <code>${escapeHtml(traceId)}</code>
<b>Error:</b> <code>${escapeHtml(errorMsg)}</code>

⚠️ <i>El Circuit Breaker o el fallback local se ha activado para proteger la experiencia del usuario. Por favor verifica la disponibilidad de Google Cloud o el balanceador.</i>
━━━━━━━━━━━━━━━━━━━━`;

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    return true;
  } catch (err) {
    logger.error('[telegram-service] Error construyendo alerta de agente:', err);
    return false;
  }
}

