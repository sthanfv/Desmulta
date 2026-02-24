import { NextResponse } from 'next/server';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';

// ✅ MANDATO-FILTRO: Webhook protegido con el secret token de Telegram.
// Configurado al registrar el webhook: setWebhook?secret_token=TELEGRAM_WEBHOOK_SECRET
// Telegram envía este token en cada request en el header X-Telegram-Bot-Api-Secret-Token.

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number };
    text?: string;
    date: number;
  };
}

async function sendTelegramMessage(token: string, chatId: number, text: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
}

export async function POST(request: Request) {
  // ✅ Validar secret token de Telegram
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const receivedToken = request.headers.get('X-Telegram-Bot-Api-Secret-Token');

  if (!webhookSecret || receivedToken !== webhookSecret) {
    // ✅ Respondemos 200 de todas formas: Telegram necesita 200 o reintentará indefinidamente.
    // Simplemente ignoramos el update inválido.
    return NextResponse.json({ ok: true });
  }

  const { TELEGRAM_BOT_TOKEN } = process.env;
  if (!TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ ok: true });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const message = update.message;
  if (!message?.text) {
    return NextResponse.json({ ok: true });
  }

  const chatId = message.chat.id;
  const text = message.text.trim().toLowerCase();

  try {
    getAdminApp();
    const db = getFirestore();

    if (text === '/resumen' || text === '/resumen@desmultabot') {
      // ✅ COSTO OPTIMIZADO: count() es más barato que getAll()
      const startOfToday = Timestamp.fromDate(
        new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }).split(',')[0])
      );

      const [totalCount, failedCount, todayCount] = await Promise.all([
        db.collection('consultations').count().get(),
        db.collection('consultations').where('telegramStatus', '==', 'failed').count().get(),
        db.collection('consultations').where('createdAt', '>=', startOfToday).count().get(),
      ]);

      const total = totalCount.data().count;
      const failed = failedCount.data().count;
      const today = todayCount.data().count;
      const delivered = total - failed;

      await sendTelegramMessage(
        TELEGRAM_BOT_TOKEN,
        chatId,
        `📊 <b>RESUMEN DESMULTA</b>
━━━━━━━━━━━━━━━━━━━━

📥 <b>Hoy:</b> ${today} consulta(s)
✅ <b>Total entregadas:</b> ${delivered}
⚠️ <b>Pendientes de reintento:</b> ${failed}
📦 <b>Total histórico:</b> ${total}

━━━━━━━━━━━━━━━━━━━━
💡 <i>Usa /pendientes para ver los fallidos.</i>`
      );
    } else if (text === '/pendientes' || text === '/pendientes@desmultabot') {
      const failedSnap = await db
        .collection('consultations')
        .where('telegramStatus', '==', 'failed')
        .count()
        .get();

      const count = failedSnap.data().count;

      if (count === 0) {
        await sendTelegramMessage(
          TELEGRAM_BOT_TOKEN,
          chatId,
          '✅ <b>Sin pendientes.</b> Todas las notificaciones fueron entregadas correctamente.'
        );
      } else {
        await sendTelegramMessage(
          TELEGRAM_BOT_TOKEN,
          chatId,
          `⚠️ <b>NOTIFICACIONES PENDIENTES</b>
━━━━━━━━━━━━━━━━━━━━

🔴 <b>${count} consulta(s)</b> sin notificación entregada.

💡 <i>El sistema cron las reintentará automáticamente cada 10 minutos.</i>`
        );
      }
    } else if (text === '/start' || text === '/help') {
      await sendTelegramMessage(
        TELEGRAM_BOT_TOKEN,
        chatId,
        `🤖 <b>DESMULTA BOT</b>
━━━━━━━━━━━━━━━━━━━━

Comandos disponibles:

📊 /resumen — Estadísticas de hoy y totales
⚠️ /pendientes — Notificaciones fallidas
ℹ️ /help — Esta ayuda`
      );
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[telegram-webhook] Error:', errMsg);
    // ✅ Respondemos 200 de todas formas para no causar reintentos de Telegram
  }

  // ✅ Telegram requiere respuesta 200 en menos de 5 segundos
  return NextResponse.json({ ok: true });
}
