import { isIP } from 'net';
import { promises as dns } from 'dns';

/**
 * Valida que una URL de webhook entrante sea segura para prevenir ataques de
 * Server-Side Request Forgery (SSRF).
 *
 * Específicamente:
 * - Solo permite el protocolo HTTPS.
 * - Bloquea direcciones IP privadas y de loopback (IPv4 e IPv6).
 * - Bloquea el acceso a rangos de metadatos de proveedores cloud conocidos.
 * - Bloquea nombres de host locales o internos conocidos.
 * - Resuelve el DNS para verificar la IP final, evitando el bypass DNS o notaciones engañosas IPv6.
 *
 * @param rawUrl La URL cruda provista por el cliente.
 * @throws {Error} Si la URL no cumple con los criterios de seguridad.
 */

const BLOCKED_PATTERNS = [
  /^127\./, // Loopback IPv4
  /^10\./, // Clase A privada
  /^192\.168\./, // Clase C privada
  /^172\.(1[6-9]|2\d|3[01])\./, // Clase B privada
  /^169\.254\./, // Link-local / Metadata de Cloud (AWS, GCP, OpenStack)
  /^100\.64\./, // Vercel / CGNAT redes internas
  /^0\./, // Red local (no enrutable)
];

const BLOCKED_V6_PREFIXES = [
  '::1', // Loopback IPv6
  'fc00:', // Unique Local Address IPv6
  'fd', // Unique Local Address IPv6
  '::ffff:169.254.', // Metadata IPv4-mapped
  '::ffff:127.', // Loopback IPv4-mapped
  '::ffff:10.', // Clase A IPv4-mapped
];

const BLOCKED_HOSTS = [
  'metadata.google.internal',
  'metadata.google',
  'instance-data',
  '169.254.169.254',
  'localhost',
  'local',
  'internal',
];

function isBlockedIp(ip: string): boolean {
  const clean = ip.replace(/^\[|\]$/g, '').toLowerCase();
  if (BLOCKED_PATTERNS.some((p) => p.test(clean))) return true;
  if (BLOCKED_V6_PREFIXES.some((p) => clean.startsWith(p))) return true;
  return false;
}

export async function validateWebhookUrl(rawUrl: string): Promise<void> {
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

  const hostname = url.hostname.toLowerCase();

  if (BLOCKED_HOSTS.some((h) => hostname.includes(h))) {
    throw new Error('Host no permitido');
  }

  const cleanHostname = hostname.replace(/^\[|\]$/g, '');

  // Si ya es literal IP, validar directo
  if (isIP(cleanHostname)) {
    if (isBlockedIp(cleanHostname)) {
      throw new Error('webhookUrl apunta a una red privada o no permitida');
    }
    return;
  }

  // Resolver DNS y validar TODAS las IPs devueltas (A y AAAA)
  try {
    const addresses = await dns.lookup(cleanHostname, { all: true });
    if (addresses.length === 0) {
      throw new Error('No se pudo resolver el webhookUrl');
    }
    if (addresses.some((a) => isBlockedIp(a.address))) {
      throw new Error('webhookUrl resuelve a una red privada o no permitida');
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('red privada')) {
      throw err;
    }
    throw new Error('No se pudo resolver el webhookUrl o el host no existe');
  }
}
