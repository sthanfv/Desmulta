import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { buildCaseReplyMarkup } from './telegramWebhook';

const MAX_RETRIES_PER_RUN = 10;

/**
 * Cron Job: Reintento de Notificaciones Telegram
 * Frecuencia: Cada 15 minutos
 */
export const cronRetryNotifications = onSchedule({
  schedule: '*/15 * * * *',
  timeZone: 'America/Bogota',
  region: 'us-central1',
  secrets: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID']
}, async () => {
  const db = admin.firestore();
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) return;

  try {
    const failedQuery = await db.collection('consultations')
      .where('telegramStatus', '==', 'failed')
      .orderBy('createdAt', 'asc')
      .limit(MAX_RETRIES_PER_RUN)
      .get();

    if (failedQuery.empty) return;

    for (const docSnap of failedQuery.docs) {
      const data = docSnap.data();
      const docId = docSnap.id;

      const tel = (data.contacto || '').replace(/\D/g, '');
      const wa = tel.startsWith('57') ? tel : `57${tel}`;
      const whatsappUrl = `https://wa.me/${wa}`;
      const replyMarkup = buildCaseReplyMarkup(docId, whatsappUrl, data.status);

      const message = `<b>🔄 REINTENTO AUTOMÁTICO</b>\n━━━━━━━━━━━━━━━━━━━━\n\n👤 <b>Cliente:</b> ${data.nombre}\n🆔 <b>ID:</b> <code>${docId}</code>\n🚗 <b>Placa:</b> <code>${data.placa || 'N/A'}</code>\n━━━━━━━━━━━━━━━━━━━━`;

      const telegramRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
          reply_markup: replyMarkup
        })
      });

      if (telegramRes.ok) {
        const tgData = await telegramRes.json() as any;
        const telegramMsgId = tgData?.result?.message_id;

        await docSnap.ref.update({
          telegramStatus: 'sent',
          telegramMessageId: telegramMsgId || null,
          retriedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }
  } catch (err) {
    logger.error('[cronRetryNotifications] Error:', err);
  }
});
