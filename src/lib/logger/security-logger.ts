/**
 * SecurityLogger: Motor de auditoría con ofuscación automática de PII (v2.4.4).
 * MANDATO-FILTRO: Protección estricta de datos personales en logs.
 */
/* eslint-disable security/detect-unsafe-regex */
import * as Sentry from '@sentry/nextjs';

/**
 * Filtro de seguridad MANDATO-FILTRO:
 * Sanitiza cualquier cadena de texto reemplazando PII con asteriscos.
 */
export const sanitizarPII = (mensaje: string): string => {
  if (!mensaje) return mensaje;

  let mensajeSeguro = mensaje;

  // 1. Ofuscar Teléfonos Móviles Colombianos (ej. 300 123 4567 o +573001234567)
  // Específico para Colombia (empiezan por 3)
  mensajeSeguro = mensajeSeguro.replace(
    /(\+?57)?\s*(3\d{2})\s*\d{5}\s*(\d{2})/g,
    (_, p1, p2, p3) => (p1 ? `${p1} ${p2}*****${p3}` : `${p2}*****${p3}`)
  );

  // 2. Ofuscar Cédulas de Ciudadanía (7 a 10 dígitos)
  // Solo si no fue procesado como teléfono (números que no empiezan por 3 si son de 10 dígitos, o de otros tamaños)
  // El \b asegura que no estemos en medio de otra palabra/número
  mensajeSeguro = mensajeSeguro.replace(/\b(\d{2})\d{3,6}(\d{2})\b/g, (match) => {
    // Si ya tiene asteriscos (fue procesado por el de teléfono), no lo tocamos
    if (match.includes('*')) return match;
    const start = match.slice(0, 2);
    const end = match.slice(-2);
    return `${start}****${end}`;
  });

  // 3. Ofuscar Correos Electrónicos
  mensajeSeguro = mensajeSeguro.replace(
    /\b([a-zA-Z0-9])[a-zA-Z0-9._%+-]*(@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g,
    '$1***$2'
  );

  return mensajeSeguro;
};

const getFingerprint = (contexto: string): string[] => {
  const ctxLower = contexto.toLowerCase();
  if (ctxLower.includes('telegram')) return ['telegram-service'];
  if (ctxLower.includes('firebase')) return ['firebase-auth'];
  if (ctxLower.includes('ocr') || ctxLower.includes('tesseract')) return ['ocr-engine'];
  if (ctxLower.includes('pdf')) return ['pdf-generator'];
  return ['desmulta-core'];
};

/**
 * Envía una alerta técnica directa al chat de Telegram de Soporte (MANDATO-FILTRO)
 */
const sendTelegramAlert = (contexto: string, mensaje: string) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_DEV_CHAT_ID || process.env.TELEGRAM_SECURITY_CHAT_ID;

  if (!token || !chatId) return; // Si no hay configuración, saltamos silenciosamente

  const fechaAmigable = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    dateStyle: 'full',
    timeStyle: 'medium',
    hour12: true,
  }).format(new Date());

  const text = `🚨 <b>ERROR DEL SISTEMA: Desmulta</b>\n📍 <b>Origen:</b> <code>${contexto}</code>\n⚠️ <b>Detalle:</b>\n<pre>${mensaje}</pre>\n⏱ <b>Fecha:</b> ${fechaAmigable}`;

  fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  }).catch((err) => console.error('[TELEGRAM_FAIL] No se pudo alertar a Telegram:', err));
};

export const SecurityLogger = {
  info: (contexto: string, datos?: unknown) => {
    const logSanitizado = sanitizarPII(JSON.stringify(datos || {}));
    console.info(`[INFO] ${contexto}:`, logSanitizado);
  },
  warn: (contexto: string, datos?: unknown) => {
    const logSanitizado = sanitizarPII(JSON.stringify(datos || {}));
    console.warn(`[WARN] ${contexto}:`, logSanitizado);

    const fp = getFingerprint(contexto);
    Sentry.withScope((scope) => {
      scope.setFingerprint(fp);
      scope.setLevel('warning');
      scope.setExtra('contexto', contexto);
      scope.setExtra('datos', logSanitizado);
      Sentry.captureMessage(`[WARN] ${contexto}`);
    });
  },
  error: (contexto: string, datos?: unknown) => {
    const logSanitizado = sanitizarPII(JSON.stringify(datos || {}));
    console.error(`[ERROR] ${contexto}:`, logSanitizado);

    // Enviar a Telegram Inmediatamente
    sendTelegramAlert(contexto, logSanitizado);

    // Capturar en Sentry para visibilidad en producción
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureMessage(`${contexto}: ${logSanitizado}`, {
        level: 'error',
        fingerprint: getFingerprint(contexto),
      });
    }
  },
  security: (contexto: string, datos?: unknown) => {
    const logSanitizado = sanitizarPII(JSON.stringify(datos || {}));
    console.warn(`[SECURITY EVENT] ${contexto}:`, logSanitizado);

    // Los eventos de seguridad siempre van a Sentry
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureMessage(`[SECURITY] ${contexto}: ${logSanitizado}`, {
        level: 'warning',
        fingerprint: ['security-event', ...getFingerprint(contexto)],
      });
    }
  },
};

export const logger = SecurityLogger;
