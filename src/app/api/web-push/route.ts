import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getMessaging } from 'firebase-admin/messaging';
import { logger } from '@/lib/logger/security-logger';
import { z } from 'zod';

const MAX_TOKENS = 100;

/**
 * Schema de validación Zod para el payload de notificaciones FCM multicast.
 * Previene inyección de objetos anidados malformados o tipos incorrectos.
 */
const WebPushPayloadSchema = z.object({
  tokens: z
    .array(z.string().min(1).max(500))
    .min(1, 'Se requiere al menos un token')
    .max(MAX_TOKENS, `Máximo ${MAX_TOKENS} tokens por petición`),
  title: z.string().min(1, 'El título es requerido').max(200),
  message: z.string().min(1, 'El mensaje es requerido').max(1000),
  url: z.string().url().optional(),
});

/**
 * Endpoint interno para envío de notificaciones FCM multicast.
 * Solo puede ser llamado por el servidor interno via INTERNAL_API_SECRET.
 *
 * Seguridad aplicada:
 * - Autenticación con INTERNAL_API_SECRET.
 * - Validación de schema completo con Zod antes de tocar Firebase.
 * - Límite estricto de tokens vía schema.
 */
export async function POST(req: NextRequest) {
  // ✅ Verificar que solo el servidor interno puede llamar este endpoint
  const internalSecret = process.env.INTERNAL_API_SECRET;
  const received = req.headers.get('x-internal-secret') || '';

  if (!internalSecret) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { timingSafeEqual } = await import('crypto');
  const a = Buffer.from(received);
  const b = Buffer.from(internalSecret);
  const isLengthEqual = a.length === b.length;
  const isSecretMatch = timingSafeEqual(a, isLengthEqual ? b : a);

  if (!isLengthEqual || !isSecretMatch) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: 'Payload JSON inválido' }, { status: 400 });
    }

    // 🛡️ SEGURIDAD: Validación con Zod — previene inyección de objetos malformados
    const parsed = WebPushPayloadSchema.safeParse(rawBody);
    if (!parsed.success) {
      logger.warn('[WebPush] Payload inválido rechazado por schema Zod', {
        errores: parsed.error.flatten(),
      });
      return NextResponse.json(
        { error: 'Payload inválido', detalles: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { tokens, title, message, url } = parsed.data;

    const payload = {
      notification: {
        title,
        body: message,
      },
      webpush: {
        fcmOptions: {
          link: url || 'https://desmulta.online/',
        },
      },
      tokens,
    };

    const app = getAdminApp();
    const response = await getMessaging(app).sendEachForMulticast(payload);

    // ⚠️ Loggear tokens que fallaron (pueden estar expirados)
    if (response.failureCount > 0) {
      logger.warn('[WebPush Send] Tokens con fallo de entrega FCM', {
        failureCount: response.failureCount,
        successCount: response.successCount,
        total: tokens.length,
        // No loggeamos los tokens mismos por privacidad
      });
    }

    return NextResponse.json(
      {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('[WebPush Send] Error crítico enviando notificación FCM', {
      error: error instanceof Error ? error.message : 'Error desconocido',
    });

    return NextResponse.json(
      { error: 'Hubo un error al despachar la notificación nativa' },
      { status: 500 }
    );
  }
}
