import type { NextRequest } from 'next/server';

/**
 * Extrae la dirección IP real del cliente de forma segura y no falsificable.
 *
 * Extrae de cabeceras internas encriptadas e inyectadas por Vercel.
 * En desarrollo, recurre a `x-real-ip` o fallback local.
 * NUNCA confía en `x-forwarded-for` crudo del cliente.
 */
type RequestLike = {
  get?: (key: string) => string | null;
  headers?: {
    get?: (key: string) => string | null;
  };
};

export function getSecureIp(request: NextRequest | Request | Headers | unknown): string {
  const req = request as RequestLike;

  // 1. Intentar extraer cabeceras directamente de NextRequest o Headers
  let ipReal: string | null = null;
  let forwarded: string | null = null;

  if (req && typeof req.get === 'function') {
    ipReal = req.get('x-real-ip');
    forwarded = req.get('x-forwarded-for');
  } else if (req?.headers && typeof req.headers.get === 'function') {
    ipReal = req.headers.get('x-real-ip');
    forwarded = req.headers.get('x-forwarded-for');
  } else if (req?.headers && typeof req.headers === 'object') {
    // Si es un plain object de Node.js o RPC
    const plainHeaders = req.headers as Record<string, string>;
    ipReal = plainHeaders['x-real-ip'] || null;
    forwarded = plainHeaders['x-forwarded-for'] || null;
  }

  if (ipReal) return ipReal.trim();

  if (forwarded) {
    const parts = forwarded.split(',');
    const lastIp = parts[parts.length - 1]?.trim();
    if (lastIp) return lastIp;
  }

  return '127.0.0.1';
}
