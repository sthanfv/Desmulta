import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger/security-logger';
import { timingSafeEqual } from 'crypto';

// ── Helpers para Telegram ───────────────────────────────────────────────────
function escapeHtml(text: unknown): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const secretFromUrl = searchParams.get('secret');

    // 🛡️ F-11 DEVSECOPS: Rechazar activamente si el secreto se proporciona en la URL (Evita filtraciones en logs de red)
    if (secretFromUrl) {
      logger.security(
        '[sentry-webhook] Intento de acceso rechazado: secreto expuesto en los parámetros de la URL'
      );
      return NextResponse.json(
        {
          error:
            'Acceso prohibido: el secreto no debe enviarse a través de la URL. Use la cabecera x-sentry-hook-secret.',
        },
        { status: 400 }
      );
    }

    const providedSecret = req.headers.get('x-sentry-hook-secret') || '';
    const expectedSecret = process.env.SENTRY_WEBHOOK_SECRET;

    // 1. Validación de seguridad estricta
    if (!expectedSecret) {
      logger.error('[sentry-webhook] SENTRY_WEBHOOK_SECRET no está configurada en .env');
      return NextResponse.json({ error: 'Configuración ausente en el servidor' }, { status: 500 });
    }

    const a = Buffer.from(providedSecret);
    const b = Buffer.from(expectedSecret);
    const isLengthEqual = a.length === b.length;
    const isSecretMatch = timingSafeEqual(a, isLengthEqual ? b : a);

    if (!isLengthEqual || !isSecretMatch) {
      logger.security('[sentry-webhook] Intento de acceso denegado (secret inválido)');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 2. Parsear el payload de Sentry
    const body = await req.json();

    // Sentry envía diferentes payloads dependiendo de si es un 'Metric Alert' o un 'Issue Alert'
    // Intentaremos extraer los campos más relevantes de ambas posibilidades.
    const project = body.project_name || body.project || 'Desmulta';
    const level = body.level || 'error';

    // El título principal del error
    const title = body.event?.title || body.message || body.action || 'Nueva Alerta de Sentry';

    // Archivo o ubicación del error
    const culprit = body.culprit || body.event?.culprit || 'Ubicación desconocida';

    // URL directa al error en el panel de Sentry
    const url = body.url || body.event?.web_url || '#';

    // 3. Construir mensaje HTML para Telegram
    const emojiMap: Record<string, string> = {
      fatal: '🆘',
      error: '🚨',
      warning: '⚠️',
      info: 'ℹ️',
      debug: '🐛',
    };
    const emoji = emojiMap[level.toLowerCase()] || '🚨';

    const message = `<b>${emoji} SENTRY ALERT [${escapeHtml(level.toUpperCase())}]</b>
━━━━━━━━━━━━━━━━━━━━
<b>Proyecto:</b> <code>${escapeHtml(project)}</code>

<b>Error:</b>
<i>${escapeHtml(title)}</i>

<b>Ubicación:</b>
<code>${escapeHtml(culprit)}</code>
━━━━━━━━━━━━━━━━━━━━
<a href="${escapeHtml(url)}">👉 Ver detalles en Sentry</a>`;

    // 4. Enviar a Telegram
    const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, TELEGRAM_DEV_CHAT_ID } = process.env;
    const targetChatId = TELEGRAM_DEV_CHAT_ID || TELEGRAM_CHAT_ID;

    if (!TELEGRAM_BOT_TOKEN || !targetChatId) {
      logger.error('[sentry-webhook] Credenciales de Telegram no configuradas');
      return NextResponse.json({ error: 'Telegram no configurado' }, { status: 500 });
    }

    const sendTelegram = async () => {
      try {
        const telegramRes = await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: targetChatId,
              text: message,
              parse_mode: 'HTML',
              disable_web_page_preview: true,
            }),
          }
        );

        if (!telegramRes.ok) {
          const errorData = await telegramRes.text();
          logger.error('[sentry-webhook] Fallo enviando a Telegram', { errorData });
        }
      } catch (err) {
        logger.error('[sentry-webhook] Fallo red enviando a Telegram', { err: String(err) });
      }
    };

    import('@vercel/functions')
      .then(({ waitUntil }) => {
        waitUntil(sendTelegram());
      })
      .catch(() => {
        // Fallback si no está en Vercel
        sendTelegram();
      });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('[sentry-webhook] Error no controlado', { error: msg });
    return NextResponse.json(
      { error: 'Error interno del servidor. Referencia: sentry-wh' },
      { status: 500 }
    );
  }
}
