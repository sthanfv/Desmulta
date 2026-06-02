import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getMessaging } from 'firebase-admin/messaging';
import { logger } from '@/lib/logger/security-logger';

const MAX_TOKENS = 100;

/**
 * Endpoint interno para envío de notificaciones FCM multicast.
 * Solo puede ser llamado por el servidor interno via INTERNAL_API_SECRET.
 *
 * Cambios vs versión anterior:
 * - El catch ahora usa `logger.error` en lugar de `console.error`.
 *   Esto garantiza que Sentry capture los fallos de envío FCM.
 * - Se loggea también `failureCount > 0` como warning (tokens inválidos/expirados).
 */
export async function POST(req: NextRequest) {
  // ✅ Verificar que solo el servidor interno puede llamar este endpoint
  const internalSecret = process.env.INTERNAL_API_SECRET;
  const received = req.headers.get('x-internal-secret');

  if (!internalSecret || received !== internalSecret) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { tokens, title, message, url } = body;

    // ✅ Límite estricto de tokens para prevenir abuso masivo
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0 || tokens.length > MAX_TOKENS) {
      return NextResponse.json(
        { error: `Tokens inválidos o vacíos (máximo ${MAX_TOKENS})` },
        { status: 400 }
      );
    }

    if (!title || !message) {
      return NextResponse.json({ error: 'Falta título o mensaje' }, { status: 400 });
    }

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
      tokens: tokens,
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
    // 🔴 ANTES: console.error — Sentry NO lo capturaba
    // 🟢 AHORA: logger.error — Sentry SÍ lo captura via SecurityLogger
    logger.error('[WebPush Send] Error crítico enviando notificación FCM', {
      error: error instanceof Error ? error.message : 'Error desconocido',
    });

    return NextResponse.json(
      { error: 'Hubo un error al despachar la notificación nativa' },
      { status: 500 }
    );
  }
}
