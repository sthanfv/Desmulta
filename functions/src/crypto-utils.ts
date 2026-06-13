import * as crypto from 'crypto';

const SYMMETRIC_ALGO = 'aes-256-gcm';
const ENC_PREFIX = 'ENC:';

/**
 * Obtiene la clave simétrica derivada mediante SHA-256 a partir del secreto del servidor.
 * Replicado de server-crypto.ts para mantener compatibilidad 100%.
 */
function getSymmetricKey(): Buffer {
  const keyBase = process.env.PII_ENCRYPTION_KEY || process.env.PII_HMAC_SECRET;
  if (!keyBase) {
    throw new Error('🛡️ [DevSecOps] PII_ENCRYPTION_KEY o PII_HMAC_SECRET no configurada.');
  }
  return crypto.createHash('sha256').update(keyBase).digest();
}

/**
 * Desencripta texto cifrado mediante AES-256-GCM.
 * Si el texto no está cifrado (no tiene el prefijo ENC:), lo devuelve intacto.
 *
 * @param encryptedString Cadena cifrada con el formato ENC:iv:authTag:encrypted
 * @returns Texto original descifrado
 */
export function decryptSymmetric(encryptedString: string): string {
  if (!encryptedString || !encryptedString.startsWith(ENC_PREFIX)) {
    return encryptedString;
  }

  const parts = encryptedString.substring(ENC_PREFIX.length).split(':');
  if (parts.length !== 3) {
    throw new Error('Formato de encriptación simétrica inválido.');
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const key = getSymmetricKey();

  const decipher = crypto.createDecipheriv(SYMMETRIC_ALGO, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Encripta texto plano mediante AES-256-GCM.
 * Replicado de server-crypto.ts para mantener compatibilidad 100%.
 *
 * @param text Texto plano a encriptar
 * @returns Cadena cifrada con el formato ENC:iv:authTag:encrypted
 */
export function encryptSymmetric(text: string): string {
  if (!text) return text;

  const iv = crypto.randomBytes(12);
  const key = getSymmetricKey();
  const cipher = crypto.createCipheriv(SYMMETRIC_ALGO, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${ENC_PREFIX}${iv.toString('hex')}:${authTag}:${encrypted}`;
}
