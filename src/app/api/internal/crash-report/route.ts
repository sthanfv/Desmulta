import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger/security-logger';
import { rateLimit } from '@/lib/security/rate-limit';
import { getAdminApp } from '@/lib/firebase-admin';

try {
  getAdminApp();
} catch (error) {
  const message = error instanceof Error ? error.message : 'Error desconocido';
  logger.error('[firebase-admin] Fallo preventivo de inicialización:', { error: message });
}

const CrashPayloadSchema = z.object({
  message: z.string(),
  digest: z.string().optional(),
  path: z.string(),
});

const MAX_REQUESTS_PER_WINDOW = 5;
const WINDOW_MS = 60 * 1000; // 1 minuto por IP

function escapeMarkdownV2(text: string): string {
  if (!text) return '';
  return text.replace(/([_*\[\]()~`>#\+\-=|{}\.!])/g, '\\$1');
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown_ip';
    const safeIpId = ip.replace(/[^a-zA-Z0-9]/g, '_');

    const rl = await rateLimit(
      `crash_report:${safeIpId}`,
      MAX_REQUESTS_PER_WINDOW,
      WINDOW_MS,
      'telemetryCooldowns'
    );
    if (!rl.success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Payload JSON inválido' }, { status: 400 });
    }

    const result = CrashPayloadSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Esquema inválido' }, { status: 400 });
    }

    const data = result.data;

    // 1. Guardar en Firestore
    try {
      const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
      const db = getFirestore(getAdminApp());
      await db.collection('crash_reports').add({
        message: data.message,
        digest: data.digest || 'N/A',
        path: data.path,
        ip: ip,
        timestamp: FieldValue.serverTimestamp(),
        userAgent: req.headers.get('user-agent') || 'Unknown',
      });
    } catch (dbErr) {
      logger.error('[crash-report] Error guardando en Firestore', { err: String(dbErr) });
    }

    // 2. Notificar por Telegram (al canal de DEV)
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const devChatId = process.env.TELEGRAM_DEV_CHAT_ID || process.env.TELEGRAM_CHAT_ID;

    if (botToken && devChatId) {
      const safeMessage = escapeMarkdownV2(data.message.substring(0, 500));
      const safePath = escapeMarkdownV2(data.path);
      const safeDigest = escapeMarkdownV2(data.digest || 'N/A');

      const textMessage = `
🚨 *CRÍTICO: ERROR DE RENDERIZADO 500* 🚨

📍 *Ruta:* \`${safePath}\`
💥 *Mensaje:*
\`\`\`
${safeMessage}
\`\`\`
🔑 *Digest ID:* \`${safeDigest}\`

_Un usuario se ha topado con la pantalla de interrupción._`;

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: devChatId,
          text: textMessage,
          parse_mode: 'MarkdownV2',
        }),
      }).catch(() => { /* Fallo silencioso */ });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error('[crash-report] Falla en endpoint', { error: String(error) });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
