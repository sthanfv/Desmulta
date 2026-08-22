import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger/security-logger';

export async function POST(request: Request) {
  try {
    const { getSecureIp } = await import('@/lib/security/ip-utils');
    const ip = getSecureIp(request);
    const { rateLimit } = await import('@/lib/security/rate-limit');

    // Límite estricto: 5 errores por minuto por IP para evitar SPAM hacia Telegram
    const { success } = await rateLimit(ip, 5, 60 * 1000, 'web_push_error_rl');
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    if (body.error) {
      const errorMsg = typeof body.error === 'string' ? body.error : JSON.stringify(body.error);
      logger.error(`[WebPush Client] Fallo al activar alertas FCM`, {
        error: errorMsg,
        docId: body.docId || 'N/A',
        userAgent: request.headers.get('user-agent') || 'Unknown',
      });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }
}
