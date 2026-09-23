import { isIP, BlockList } from 'net';
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

// [2026-09-22] FIX: rangos por subred con net.BlockList (antes regex/prefijos de texto).
// Cubre IPv4-mapped en forma hexadecimal (p. ej. [::ffff:a9fe:a9fe] = 169.254.169.254,
// que es como el parser WHATWG serializa [::ffff:169.254.169.254]), link-local IPv6,
// multicast, benchmarking, 6to4/NAT64 y el resto de rangos no enrutables.
const blocklist = new BlockList();
(
  [
    ['0.0.0.0', 8],
    ['10.0.0.0', 8],
    ['100.64.0.0', 10], // CGNAT
    ['127.0.0.0', 8],
    ['169.254.0.0', 16], // link-local / metadata cloud
    ['172.16.0.0', 12],
    ['192.0.0.0', 24],
    ['192.0.2.0', 24],
    ['192.168.0.0', 16],
    ['198.18.0.0', 15],
    ['198.51.100.0', 24],
    ['203.0.113.0', 24],
    ['224.0.0.0', 4], // multicast
    ['240.0.0.0', 4], // reservado + broadcast
  ] as const
).forEach(([net, prefix]) => blocklist.addSubnet(net, prefix, 'ipv4'));
(
  [
    ['::', 128],
    ['::1', 128],
    ['64:ff9b::', 96], // NAT64
    ['2001:db8::', 32],
    ['2002::', 16], // 6to4 (puede encapsular IPv4 privadas)
    ['fc00::', 7], // ULA
    ['fe80::', 10], // link-local
    ['ff00::', 8], // multicast
  ] as const
).forEach(([net, prefix]) => blocklist.addSubnet(net, prefix, 'ipv6'));

function ipv4FromMapped(ip: string): string | null {
  if (!ip.startsWith('::ffff:')) return null;
  const rest = ip.slice('::ffff:'.length);
  if (isIP(rest) === 4) return rest; // ::ffff:127.0.0.1
  const parts = rest.split(':'); // ::ffff:7f00:1 (forma hexadecimal)
  if (parts.length === 2 && parts.every((p) => /^[0-9a-f]{1,4}$/i.test(p))) {
    const hi = parseInt(parts[0], 16);
    const lo = parseInt(parts[1], 16);
    return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
  }
  return null;
}

export function isBlockedIp(ip: string): boolean {
  const clean = ip
    .replace(/^\[|\]$/g, '')
    .toLowerCase()
    .split('%')[0];
  const version = isIP(clean);
  if (version === 4) return blocklist.check(clean, 'ipv4');
  if (version === 6) {
    const mapped = ipv4FromMapped(clean);
    return mapped ? blocklist.check(mapped, 'ipv4') : blocklist.check(clean, 'ipv6');
  }
  return true; // Cualquier cosa que no sea IP válida → bloquear
}

const BLOCKED_HOST_SUFFIXES = ['.internal', '.local', '.localhost', '.home.arpa'];
const BLOCKED_HOSTS = ['localhost', 'metadata.google.internal', 'metadata', 'instance-data'];

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

  // [2026-09-22] Coincidencia exacta/sufijo (antes `includes('local')` bloqueaba p. ej. localiza.com)
  if (
    BLOCKED_HOSTS.includes(hostname) ||
    BLOCKED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
  ) {
    throw new Error('Host no permitido');
  }
  if (url.port && url.port !== '443') {
    throw new Error('webhookUrl solo puede usar el puerto 443');
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
