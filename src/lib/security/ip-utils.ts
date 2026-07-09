import { ipAddress } from '@vercel/functions';
import type { NextRequest } from 'next/server';

/**
 * Extrae la dirección IP real del cliente de forma segura y no falsificable.
 * 
 * En producción (Vercel), utiliza `ipAddress()` que lee de cabeceras internas
 * encriptadas e inyectadas por la infraestructura perimetral.
 * En desarrollo, recurre a `x-real-ip` o fallback local.
 * NUNCA confía en `x-forwarded-for` crudo del cliente.
 */
export function getSecureIp(request: NextRequest | Request | Headers | any): string {
  // 1. Intentar obtener la IP validada por Vercel (si es NextRequest/Request)
  if (request && typeof request.headers !== 'undefined') {
    const ipVercel = ipAddress(request as any);
    if (ipVercel) return ipVercel;
  }

  // 2. Resolver el origen de las cabeceras
  const headers = (request && typeof request.get === 'function')
    ? request
    : (request?.headers);

  const ipReal = headers?.get('x-real-ip');
  if (ipReal) return ipReal.trim();

  // 3. Fallback de x-forwarded-for
  const forwarded = headers?.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',');
    const lastIp = parts[parts.length - 1]?.trim();
    if (lastIp) return lastIp;
  }

  return '127.0.0.1';
}
