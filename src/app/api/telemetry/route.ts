import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger/security-logger';
import { isCleanText } from '@/lib/utils/profanity-filter';
import { rateLimit } from '@/lib/security/rate-limit';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';

// Inicializar Firebase Admin SDK via singleton seguro
try {
  getAdminApp();
} catch (error) {
  const message = error instanceof Error ? error.message : 'Error desconocido';
  logger.error('[firebase-admin] Fallo preventivo de inicialización:', { error: message });
}

// Esquema estricto de entrada (Server-side validation)
const TelemetryPayloadSchema = z.object({
  date: z.string().min(10, 'Formato de fecha inválido'),
  coactivo: z.boolean(),
  status: z.enum(['VIGENTE', 'ALERTA', 'PRESCRITA']),
  probability: z.string().min(1),
  // 🇨🇴 Prefix check: 300-305, 310-324, 350-351
  contacto: z
    .string()
    .regex(
      /^3(0[0-5]|1[0-9]|2[0-4]|5[01])[0-9]{7}$/,
      'Celular no corresponde a un operador colombiano'
    ),
  nombre: z
    .string()
    .max(60)
    .optional()
    .transform((v) => (v ? v.replace(/[<>]/g, '') : undefined)),
  website_hp: z.string().optional(), // Honeypot
});

const MAX_REQUESTS_PER_WINDOW = 3;
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 horas
// Función auxiliar para escapar caracteres especiales de MarkdownV2 en Telegram
// Telegram requiere escapar: _ * [ ] ( ) ~ ` > # + - = | { } . !
function escapeMarkdownV2(text: string): string {
  if (!text) return '';
  return text.replace(/([_*\[\]()~`>#\+\-=|{}\.!])/g, '\\$1');
}

export async function POST(req: Request) {
  try {
    getAdminApp();
    const db = getFirestore();

    // 1. Identificación de IP para rate limiting en Firestore
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown_ip';
    // Sanitizar IP para usar como ID de documento (reemplaza cualquier cosa que no sea alfanumérica por guión bajo)
    const safeIpId = ip.replace(/[^a-zA-Z0-9]/g, '_');

    // 2. Verificación de Rate Limit contra Firestore
    const rl = await rateLimit(
      `telemetry:${safeIpId}`,
      MAX_REQUESTS_PER_WINDOW,
      WINDOW_MS,
      'telemetryCooldowns'
    );
    if (!rl.success) {
      logger.security('[telemetry] Bloqueo por Rate Limit', { ip });
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intente más tarde.' },
        { status: 429 }
      );
    }

    // 4. Parseo del cuerpo JSON
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Payload JSON inválido' }, { status: 400 });
    }

    // 5. Validación con Zod (rechaza campos extra, sanitiza nombre)
    const result = TelemetryPayloadSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Esquema de payload inválido', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const data = result.data;

    // 5.5. Filtro de contenido (Groserías)
    if (data.nombre && !isCleanText(data.nombre)) {
      logger.security('[telemetry] Intento de uso de lenguaje no permitido', {
        nombre: data.nombre,
        ip,
      });
      return NextResponse.json(
        { error: 'El nombre contiene lenguaje no permitido.' },
        { status: 400 }
      );
    }

    // 6. Detección de Bot (Honeypot)
    if (data.website_hp && data.website_hp.length > 0) {
      logger.security('[telemetry] Honeypot activado — bot detectado', { ip });
      // Retornar 200 OK falso para que el bot no sepa que fue bloqueado
      return NextResponse.json({ success: true, fake: true }, { status: 200 });
    }

    // 7. Configuración de Telegram
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      logger.error('[telemetry] Credenciales de Telegram no configuradas');
      return NextResponse.json({ error: 'Error de Configuración' }, { status: 500 });
    }

    // 8. Construcción del Mensaje usando MarkdownV2
    // Se escapan los datos variables para evitar inyecciones de Markdown que rompan el parser de Telegram
    const safeDate = escapeMarkdownV2(data.date);
    const safeStatus = escapeMarkdownV2(data.status);
    const safeProbability = escapeMarkdownV2(data.probability);
    const safeContacto = escapeMarkdownV2(data.contacto);
    const safeNombre = data.nombre ? escapeMarkdownV2(data.nombre) : escapeMarkdownV2('........');

    const textMessage = `
🔔 *SOLICITUD DE REVISIÓN DE VIABILIDAD*
👤 *Nombre:* ${safeNombre}
📞 *Contacto:* \`${safeContacto}\`

📅 *Fecha Infracción:* \`${safeDate}\`
⚖️ *Cobro Coactivo:* ${data.coactivo ? 'SÍ 🔴' : 'NO 🟢'}
📊 *Dictamen:* *${safeStatus}*
🎯 *Probabilidad:* ${safeProbability}

_Solicitud captada desde la calculadora pública_
`;

    // 9. Envío a la API de Telegram
    const telegramRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: textMessage,
        parse_mode: 'MarkdownV2',
      }),
    });

    if (!telegramRes.ok) {
      const errorText = await telegramRes.text();
      logger.error('[telemetry] Error enviando a Telegram API', {
        status: telegramRes.status,
        response: errorText,
      });
      // Tolerado: No bloquear al usuario final si la notificación interna (Telegram) falla
      return NextResponse.json(
        { success: true, warning: 'Fallo al notificar al asesor' },
        { status: 200 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno';
    logger.error('[telemetry] Falla crítica en endpoint', { error: message });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
