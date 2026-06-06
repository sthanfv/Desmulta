import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/security/rate-limit';
import { logger } from '@/lib/logger/security-logger';

// Configurar el entorno de ejecución (Node.js para soportar firebase-admin)
// export const runtime = 'nodejs';

const AbandonmentSchema = z.object({
  contacto: z
    .string()
    .regex(/^3[0-9]{9}$/, 'Número de teléfono inválido')
    .nullable()
    .optional(),
  email: z.string().email().nullable().optional(),
  accion: z.enum(['ping', 'clear', 'funnel_step']),
  fcmToken: z.string().nullable().optional(),
  step: z.number().optional(),
  isSimitMode: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';

    // 🛡️ Rate Limit: máximo 10 intentos por minuto por IP
    const { success, isError } = await rateLimit(ip, 10, 1 * 60 * 1000, 'abandonmentRateLimits');

    if (!success) {
      if (isError) {
        logger.error(`[SECURITY] Rate Limit falló por error de infraestructura para: ${ip}`);
        return NextResponse.json(
          { error: 'Servicio temporalmente no disponible.' },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intente más tarde.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = AbandonmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
    }

    const { contacto, email, accion, fcmToken, step, isSimitMode } = parsed.data;

    // Si no hay información útil y no es funnel step, no hacemos nada
    if (!contacto && !email && !fcmToken && accion !== 'funnel_step') {
      return NextResponse.json({ success: true });
    }

    if (accion === 'funnel_step' && typeof step === 'number') {
      try {
        const { getAdminApp } = await import('@/lib/firebase-admin');
        const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
        const app = getAdminApp();
        const db = getFirestore(app);

        // Escribimos a la colección edge_telemetry (usando Admin SDK ignoramos las reglas restrictivas del cliente)
        await db.collection('edge_telemetry').add({
          event: 'funnel_step',
          funnelStep: step,
          isSimitMode: !!isSimitMode,
          ts: Date.now(),
          timestamp: FieldValue.serverTimestamp(),
        });
      } catch (err) {
        logger.warn('[Abandonment] Error saving funnel step:', err);
      }
      return NextResponse.json({ success: true });
    }

    if (accion === 'ping') {
      // 1. Notificar vía Telegram al operador (si hay datos de contacto)
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;

      if (botToken && chatId && (contacto || email)) {
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const text = `⚠️ *Lead Parcial Capturado* ⚠️\n\nEl usuario ingresó datos pero no ha finalizado:\n- 📞 *Contacto:* ${contacto || 'N/A'}\n- 📧 *Email:* ${email || 'N/A'}\n\n_Atención: si no recibes el form completo en unos minutos, es un abandono._`;

        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'Markdown',
            disable_notification: true,
          }),
        })
          .then(async (res) => {
            if (!res.ok) logger.warn('[abandonment] Telegram error', { status: res.status });
          })
          .catch((err) => {
            logger.warn('[abandonment] Telegram fetch falló', { err: err?.message });
          });
      }

      // 2. Activar Web Push (Lead Nurturing) si el usuario ya tiene fcmToken
      if (fcmToken) {
        try {
          const { getAdminApp } = await import('@/lib/firebase-admin');
          const { getMessaging } = await import('firebase-admin/messaging');
          const app = getAdminApp();

          await getMessaging(app).send({
            token: fcmToken,
            notification: {
              title: '⏳ ¡No pierdas tu progreso!',
              body: 'Notamos que no finalizaste tu consulta. Termina de enviarnos tus datos para evaluar tus multas gratuitamente.',
            },
            data: {
              action: 'resume_consultation',
              url: '/consultar',
            },
          });
        } catch (pushErr) {
          logger.error('[Abandonment] Error sending Web Push', {
            error: pushErr instanceof Error ? pushErr.message : String(pushErr),
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
