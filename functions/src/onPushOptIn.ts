import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';

/**
 * Trigger: onPushOptIn
 * Escucha la subcolección consultations/{id}/private/push donde se guarda el fcmToken.
 * Notifica al equipo en Telegram cuando un usuario activa notificaciones push.
 */
export const onPushOptIn = onDocumentWritten({
  // ✅ CORRECTO: escucha la subcolección donde /api/web-push/register realmente guarda el token
  document: 'consultations/{consultationId}/private/push',
  region: 'us-central1',
  secrets: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'],
}, async (event) => {
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();

  // Solo actuar si se añadió un token nuevo (no en borrados, no si no cambió)
  if (!after?.fcmToken) return;
  if (before?.fcmToken === after.fcmToken) return;

  const consultationId = event.params.consultationId;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) return;

  try {
    // Obtener datos del expediente para el mensaje de Telegram
    const db = admin.firestore();
    const consultationSnap = await db.collection('consultations').doc(consultationId).get();
    const data = consultationSnap.data();
    const nombre = data?.nombre || 'Cliente';
    const shortId = data?.shortId || consultationId.slice(0, 8).toUpperCase();

    const message = `🔔 <b>Push ACTIVADO</b>\n━━━━━━━━━━━━\nEl cliente <b>${nombre}</b> (Ref: <code>${shortId}</code>) ya puede recibir dictámenes en tiempo real.\n\n✅ El próximo cambio de estado le llegará como notificación nativa.`;

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    logger.info(`[onPushOptIn] Notificado: push activado para ${consultationId}`);
  } catch (err) {
    logger.error('[onPushOptIn] Error:', err);
  }
});
