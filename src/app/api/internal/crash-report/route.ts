import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger/security-logger';
import { rateLimit } from '@/lib/security/rate-limit';
import { getAdminApp } from '@/lib/firebase-admin';
import { timingSafeEqual } from 'crypto';

const CrashPayloadSchema = z.object({
  message: z.string(),
  digest: z.string().optional(),
  path: z.string(),
});

const MAX_REQUESTS_PER_WINDOW = 50;
const WINDOW_MS = 60 * 1000; // 1 minuto por IP

function escapeHTML(text: string): string {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function POST(req: Request) {
  try {
    // 🛡️ F-04 DEVSECOPS: Autenticación del endpoint interno
    const authHeader = req.headers.get('x-internal-secret');
    const internalSecret = process.env.CRASH_REPORT_SECRET;

    if (!internalSecret) {
      logger.error('[crash-report] CRASH_REPORT_SECRET no configurada en servidor');
      return new NextResponse('Unauthorized', { status: 500 });
    }

    const expected = Buffer.from(internalSecret);
    const expectedLength = expected.length;
    const providedBuffer = Buffer.alloc(expectedLength);
    providedBuffer.write(authHeader ?? '');

    const isLengthEqual = (authHeader ?? '').length === expectedLength;
    const isSecretMatch = timingSafeEqual(providedBuffer, expected);

    if (!isLengthEqual || !isSecretMatch) {
      logger.warn('[crash-report] Intento de acceso no autorizado a crash-report (firma inválida)');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { getSecureIp } = await import('@/lib/security/ip-utils');
    const ip = getSecureIp(req);
    const safeIpId = ip.replace(/[^a-zA-Z0-9]/g, '_');

    const rl = await rateLimit(
      `crash_report:${safeIpId}`,
      MAX_REQUESTS_PER_WINDOW,
      WINDOW_MS,
      'crash_reports_cooldown'
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
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    const processCrashReport = async () => {
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
          userAgent: userAgent,
        });
      } catch (dbErr) {
        logger.error('[crash-report] Error guardando en Firestore', { err: String(dbErr) });
      }

      // 2. Notificar por Telegram (al canal de DEV)
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const devChatId = process.env.TELEGRAM_DEV_CHAT_ID || process.env.TELEGRAM_CHAT_ID;

      if (botToken && devChatId) {
        const safeMessage = escapeHTML(data.message.substring(0, 500));
        const safePath = escapeHTML(data.path);
        const safeDigest = escapeHTML(data.digest || 'N/A');

        const textMessage = `
🚨 <b>CRÍTICO: ERROR DE RENDERIZADO 500</b> 🚨

📍 <b>Ruta:</b> <code>${safePath}</code>
💥 <b>Mensaje:</b>
<pre>${safeMessage}</pre>
🔑 <b>Digest ID:</b> <code>${safeDigest}</code>

<i>Un usuario se ha topado con la pantalla de interrupción.</i>`;

        try {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: devChatId,
              text: textMessage,
              parse_mode: 'HTML',
            }),
          });
        } catch (err) {
          logger.error('[crash-report] Fallo enviando a Telegram', { err: String(err) });
        }
      }
    };

    import('@vercel/functions')
      .then(({ waitUntil }) => {
        waitUntil(processCrashReport());
      })
      .catch(() => {
        processCrashReport();
      });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error('[crash-report] Error no controlado:', { error: String(error) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
