/**
 * 🛡️ Módulo de Criptografía Servidor (Server-Side)
 * - decryptE2EPayload: descifra payloads RSA-OAEP del cliente.
 * - hashPII: hash determinístico HMAC-SHA256 para campos PII en Firestore.
 * - signPortalSession: emite JWT HS256 de corta duración para el portal del cliente (re-exportado de portal-jwt).
 * - verifyPortalSession: verifica el JWT y devuelve el trackingUuid (re-exportado de portal-jwt).
 * Uso exclusivo en Server Actions, Edge Functions o API Routes.
 * Cumple ADR-001 Zero-PII.
 */
import crypto from 'crypto';
export { signPortalSession, verifyPortalSession } from './portal-jwt';

/**
 * Calcula un hash HMAC-SHA256 determinístico de un valor PII.
 * Usa `PII_HMAC_SECRET` como sal de servidor — nunca revela el valor original.
 *
 * @param value Valor sensible a hashear (cédula, teléfono, email…)
 * @returns Hash hex de 64 caracteres, estable para la misma sal.
 *
 * @example
 * const h = hashPII('1090123456'); // 'a3f2c1…'
 * db.where('cedulaHash', '==', h)
 */
export function hashPII(value: string): string {
  const secret = process.env.PII_HMAC_SECRET;
  if (!secret) {
    throw new Error(
      '🛡️ [DevSecOps] PII_HMAC_SECRET no configurada. Imposible hashear PII de forma segura.'
    );
  }
  return crypto.createHmac('sha256', secret).update(value.trim().toLowerCase()).digest('hex');
}

/**
 * Desencripta un payload cifrado por el cliente.
 *
 * @param encryptedBase64 Payload cifrado codificado en base64
 * @returns Objeto JSON parseado e inferido por el genérico T
 */
export function decryptE2EPayload<T = unknown>(encryptedBase64: string): T {
  const privateKeyRaw = process.env.RSA_PRIVATE_KEY;
  if (!privateKeyRaw) {
    throw new Error(
      '🛡️ [DevSecOps] RSA_PRIVATE_KEY no configurada en entorno seguro. Imposible desencriptar PII.'
    );
  }

  // Previene fallos de formato si las variables de entorno están escapadas
  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

  const buffer = Buffer.from(encryptedBase64, 'base64');

  const decrypted = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    buffer
  );

  return JSON.parse(decrypted.toString('utf8')) as T;
}
