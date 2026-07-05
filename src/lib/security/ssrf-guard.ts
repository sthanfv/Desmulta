import { isIP } from 'net';

/**
 * Valida que una URL de webhook entrante sea segura para prevenir ataques de
 * Server-Side Request Forgery (SSRF).
 *
 * Específicamente:
 * - Solo permite el protocolo HTTPS.
 * - Bloquea direcciones IP privadas y de loopback (IPv4 e IPv6).
 * - Bloquea el acceso a rangos de metadatos de proveedores cloud conocidos.
 * - Bloquea nombres de host locales o internos conocidos.
 *
 * @param rawUrl La URL cruda provista por el cliente.
 * @throws {Error} Si la URL no cumple con los criterios de seguridad.
 */
export function validateWebhookUrl(rawUrl: string): void {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('URL de webhook inválida');
  }

  // 1. Solo HTTPS permitido en producción
  if (url.protocol !== 'https:') {
    throw new Error('webhookUrl debe usar HTTPS');
  }

  // 2. Bloquear IPs privadas, locales y de metadata
  const BLOCKED_PATTERNS = [
    /^127\./, // Loopback IPv4
    /^10\./, // Clase A privada
    /^192\.168\./, // Clase C privada
    /^172\.(1[6-9]|2\d|3[01])\./, // Clase B privada
    /^169\.254\./, // Link-local / Metadata de Cloud (AWS, GCP, OpenStack)
    /^100\.64\./, // Vercel / CGNAT redes internas
    /^::1$/, // Loopback IPv6
    /^fc00:/, // Unique Local Address IPv6
    /^fd/, // Unique Local Address IPv6
    /^0\./, // Red local (no enrutable)
  ];

  const hostname = url.hostname.toLowerCase();

  // Validar si es localhost o una IP bloqueada
  if (hostname === 'localhost' || isIP(hostname) !== 0) {
    const isBlocked = BLOCKED_PATTERNS.some((p) => p.test(hostname));
    if (isBlocked || isIP(hostname) !== 0) {
      throw new Error('webhookUrl apunta a una red privada o no permitida');
    }
  }

  // Adicionalmente, si el hostname parece una IP en formato decimal u otra codificación,
  // isIP(hostname) === 0, pero los patrones de arriba pueden no capturarlo si no es formato estándar.
  // Sin embargo, isIP de Node valida formatos IPv4 e IPv6 estándar.

  // 3. Bloquear hostnames internos conocidos de proveedores de nube y resolución local
  const BLOCKED_HOSTS = [
    'metadata.google.internal',
    'metadata.google',
    'instance-data',
    '169.254.169.254',
    'localhost',
    'local',
    'internal',
  ];

  if (BLOCKED_HOSTS.some((h) => hostname.includes(h))) {
    throw new Error('Host no permitido');
  }
}
