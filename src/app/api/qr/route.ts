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

  const sizeParam = searchParams.get('size');
  const parsed = sizeParam ? parseInt(sizeParam, 10) : 150;
  const size = isNaN(parsed) ? 150 : Math.min(Math.max(parsed, 50), 1000);

  if (!data || data.length > 500) {
    return new NextResponse('Missing or invalid data parameter', { status: 400 });
  }

  // 🛡️ F-07 DEVSECOPS: Evitar phishing QR y Open Redirect restringiendo el dominio de la URL
  try {
    if (data.startsWith('http://') || data.startsWith('https://')) {
      const parsedUrl = new URL(data);
      const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://desmulta.online');
      const appUrl = new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://desmulta.online');
      const reqHost = request.headers.get('host') || '';

      const allowedHosts = [siteUrl.hostname, appUrl.hostname, reqHost, 'localhost', '127.0.0.1'];
      const isAllowedVercel = parsedUrl.hostname.endsWith('.vercel.app');

      if (!allowedHosts.includes(parsedUrl.hostname) && !isAllowedVercel) {
        return new NextResponse('URL de dominio externo no permitida', { status: 400 });
      }
    }
  } catch (_e) {
    if (data.startsWith('http') || data.includes('://')) {
      return new NextResponse('URL inválida o malformada', { status: 400 });
    }
  }

  const { getSecureIp } = await import('@/lib/security/ip-utils');
  const ip = getSecureIp(request);
  const rl = await rateLimit(`qr:${ip}`, 60, 60 * 60 * 1000, 'qrRateLimits');
  if (!rl.success) {
    const hoursLeft = Math.ceil(rl.reset / (1000 * 60 * 60));
    return new NextResponse(
      `¡Has alcanzado el límite de generación de códigos QR! Por favor, intenta de nuevo en ${hoursLeft} horas.`,
      { status: 429 }
    );
  }

  try {
    const buffer = await QRCode.toBuffer(data, {
      width: Math.min(Math.max(size, 50), 1000), // Rango seguro: 50 a 1000
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
        // 🛡️ F-14 DEVSECOPS: QR es contenido dinámico controlado por el usuario.
        // max-age=31536000 + immutable impedía correcciones en CDN por hasta 1 año.
        // s-maxage=3600 permite revalidar en el edge cada hora sin impacto de rendimiento.
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    logger.error('[API QR] Error generating QR code', { error });
    return new NextResponse('Error generating QR', { status: 500 });
  }
}
