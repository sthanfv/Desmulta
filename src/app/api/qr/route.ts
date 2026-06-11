import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { logger } from '@/lib/logger/security-logger';

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

  if (!data) {
    return new NextResponse('Missing data parameter', { status: 400 });
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
