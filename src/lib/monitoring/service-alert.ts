// ─────────────────────────────────────────────────────────────────────────────
// src/lib/monitoring/service-alert.ts — Alertas de caída de servicios (chat / OCR)
//
// Problemas que resuelve (2026-09-22):
//   - El OCR enviaba la alerta con parse_mode Markdown y el error crudo dentro: cualquier `_`
//     o comilla invertida en el mensaje hacía que Telegram la rechazara (alerta perdida).
//   - Los envíos no se esperaban: en serverless la función puede congelarse antes de salir.
//   - Sin anti-spam: una caída con 100 usuarios generaba 100 mensajes.
//   - Si Gemini fallaba pero Lector-OCR respondía, la degradación pasaba en silencio.
//
// Diseño: HTML escapado, 1 alerta por servicio cada 10 min (SET NX en Upstash; si Redis no
// responde se envía igual: mejor duplicada que perdida) y timeout corto hacia Telegram.
// Usar con `waitUntil` para no sumar latencia a la respuesta del usuario.
// ─────────────────────────────────────────────────────────────────────────────
import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger/security-logger';

export type MonitoredService = 'chat' | 'ocr' | 'ocr-fallback' | 'ocr-worker';
export type AlertSeverity = 'critical' | 'degraded';

const THROTTLE_SECONDS = 10 * 60;

const SERVICE_LABEL: Record<MonitoredService, string> = {
  chat: 'Asistente IA (chat)',
  ocr: 'OCR de comparendos',
  'ocr-fallback': 'OCR — Gemini caído, operando con Lector-OCR',
  'ocr-worker': 'OCR B2B (worker QStash)',
};

let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  redis ??= Redis.fromEnv();
  return redis;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string
  );
}

/** true si esta alerta debe enviarse (no se envió otra igual en la ventana de anti-spam). */
async function acquireAlertSlot(service: MonitoredService): Promise<boolean> {
  const client = getRedis();
  if (!client) return true;
  try {
    const result = await client.set(`alert:service:${service}`, Date.now(), {
      nx: true,
      ex: THROTTLE_SECONDS,
    });
    return result === 'OK';
  } catch {
    return true;
  }
}

export async function alertServiceFailure(
  service: MonitoredService,
  detail: string,
  options: { severity?: AlertSeverity; traceId?: string } = {}
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_DEV_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;
  if (!(await acquireAlertSlot(service))) return false;

  const severity = options.severity ?? 'critical';
  const header =
    severity === 'critical' ? '🚨 <b>SERVICIO CAÍDO</b>' : '⚠️ <b>SERVICIO DEGRADADO</b>';
  const lines = [
    header,
    `<b>Servicio:</b> ${escapeHtml(SERVICE_LABEL[service])}`,
    `<b>Detalle:</b> <code>${escapeHtml(detail.slice(0, 500))}</code>`,
  ];
  if (options.traceId) lines.push(`<b>Trace:</b> <code>${escapeHtml(options.traceId)}</code>`);
  lines.push(`<i>Próxima alerta de este servicio en ${THROTTLE_SECONDS / 60} min como mínimo.</i>`);

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: lines.join('\n'), parse_mode: 'HTML' }),
      signal: AbortSignal.timeout(4000),
    });
    return res.ok;
  } catch (error) {
    logger.warn('[service-alert] No se pudo enviar la alerta a Telegram', {
      service,
      error: String(error),
    });
    return false;
  }
}

/** Dispara la alerta sin bloquear la respuesta (waitUntil en Vercel; promesa suelta fuera). */
export function alertServiceFailureInBackground(
  service: MonitoredService,
  detail: string,
  options: { severity?: AlertSeverity; traceId?: string } = {}
): void {
  const task = alertServiceFailure(service, detail, options).catch(() => false);
  import('@vercel/functions').then(({ waitUntil }) => waitUntil(task)).catch(() => undefined);
}
