import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger/security-logger';

export async function POST(request: Request) {
  try {
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
