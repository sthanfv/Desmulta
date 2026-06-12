import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { logger } from '@/lib/logger/security-logger';
import { rateLimit } from '@/lib/security/rate-limit';

/**
 * API Route: /api/qr
 *
 * Genera un código QR dinámico en formato PNG.
 * Esto soluciona el problema de los clientes de correo (como Gmail)
 * que bloquean y rompen las imágenes base64 embedidas en el HTML.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const data = searchParams.get('data');

  if (!data || data.length > 500) {
    return new NextResponse('Missing or invalid data parameter', { status: 400 });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = await rateLimit(`qr:${ip}`, 30, 60 * 1000, 'qrRateLimits');
  if (!rl.success) {
    return new NextResponse('Too many requests', { status: 429 });
  }

  try {
    const buffer = await QRCode.toBuffer(data, {
      width: 150,
      margin: 1,
      color: {
        dark: '#000000FF',
        light: '#FFFFFFFF',
      },
    });

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    logger.error('[API QR] Error generating QR code', { error });
    return new NextResponse('Error generating QR', { status: 500 });
  }
}
