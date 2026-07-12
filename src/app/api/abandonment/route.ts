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
    const { getSecureIp } = await import('@/lib/security/ip-utils');
    const ip = getSecureIp(req);

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

    const { contacto, email, accion, fcmToken, step } = parsed.data;

    // Si no hay información útil y no es funnel step, no hacemos nada
    if (!contacto && !email && !fcmToken && accion !== 'funnel_step') {
      return NextResponse.json({ success: true });
    }

    if (accion === 'funnel_step' && typeof step === 'number') {
      // 1. Idempotencia basada en Cookies: Evitamos sumar 2 veces el mismo paso si recargan la página
      const cookieName = `funnel_step_recorded_${step}`;
      const hasRecordedStep = req.cookies.has(cookieName);

      if (hasRecordedStep) {
        return NextResponse.json({ success: true, cached: true });
      }

      try {
        const { getAdminApp } = await import('@/lib/firebase-admin');
        const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
        const app = getAdminApp();
        const db = getFirestore(app);

        // 2. Sharding Diario: Incrementamos contador global en vez de crear 5,000 documentos
        const today = new Date().toISOString().split('T')[0];
        // Utilizamos un único shard (0) para la telemetría ya que el volumen de funnel steps por segundo es bajo,
        // pero lo dejamos preparado por consistencia.
        const dailyStatsRef = db.collection('system_metrics').doc(`daily_stats_${today}_shard_0`);

        await dailyStatsRef.set(
          {
            type: 'daily',
            date: today,
            [`funnel_step_${step}`]: FieldValue.increment(1),
          },
          { merge: true }
        );
      } catch (err) {
        logger.warn('[Abandonment] Error saving funnel step counter:', err);
      }

      // Devolvemos la respuesta seteando la cookie de idempotencia
      const res = NextResponse.json({ success: true });
      res.cookies.set(cookieName, '1', {
        maxAge: 60 * 60 * 24,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      });
      return res;
    }

    if (accion === 'ping') {
      // 1. Ya no enviamos notificaciones a Telegram por abandono parcial a petición del usuario.
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
