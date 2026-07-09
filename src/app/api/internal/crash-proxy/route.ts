import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/security/rate-limit';
import { logger } from '@/lib/logger/security-logger';

/**
 * POST /api/internal/crash-proxy
 *
 * Proxy intermediario para el envío de Crash Reports desde el cliente.
 * Evita la exposición del secreto CRASH_REPORT_SECRET en el bundle de JavaScript del navegador.
 *
 * Seguridad:
 * - Rate Limit estricto por IP (máximo 5 reportes por minuto por IP).
 * - Agrega el secreto de servidor a la petición antes de enviarlo al endpoint final.
 * - Validación de origen (same-origin).
 */
export async function POST(req: Request) {
  try {
    // 1. Validar origen (same-origin)
    const secFetchSite = req.headers.get('sec-fetch-site');
    if (secFetchSite && secFetchSite !== 'same-origin') {
      logger.security('[crash-proxy] Intento de reporte desde un origen externo bloqueado');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 2. Rate Limit por IP del cliente
    const { getSecureIp } = await import('@/lib/security/ip-utils');
    const ip = getSecureIp(req);
    const safeIpId = ip.replace(/[^a-zA-Z0-9]/g, '_');

    const rl = await rateLimit(`crash_proxy:${safeIpId}`, 5, 60 * 1000, 'crash_proxy_cooldown');
    if (!rl.success) {
      logger.warn('[crash-proxy] Rate limit excedido para envíos de crash report', { ip });
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await req.json();
    const secret = process.env.CRASH_REPORT_SECRET;

    if (!secret) {
      logger.error('[crash-proxy] CRASH_REPORT_SECRET no configurada en el servidor');
      return NextResponse.json({ error: 'Configuración de servidor incompleta' }, { status: 500 });
    }

    // 3. Construir URL absoluta para el fetch interno
    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const destinationUrl = `${protocol}://${host}/api/internal/crash-report`;

    // 4. Delegar la petición al endpoint de crash-report seguro
    const response = await fetch(destinationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': secret,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.error('[crash-proxy] Error al enviar reporte al endpoint final', {
        status: response.status,
        error: errText,
      });
      return new NextResponse('Error al procesar el reporte', { status: response.status });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error('[crash-proxy] Error en proxy de crash-report:', { error: String(error) });
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
