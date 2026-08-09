import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Recomendado para GCM
const AUTH_TAG_LENGTH = 16;

/**
 * Obtiene la llave de encriptación de 32 bytes
 */
function getEncryptionKey(): Buffer {
  const hexKey = process.env.SIMIT_ENCRYPTION_KEY;
  if (!hexKey) throw new Error('SIMIT_ENCRYPTION_KEY no configurada');
  const buffer = Buffer.from(hexKey, 'hex');
  if (buffer.length !== 32) throw new Error('SIMIT_ENCRYPTION_KEY debe ser de 32 bytes (64 caracteres hex)');
  return buffer;
}

/**
 * Obtiene el Salt para Hashing
 */
function getSalt(): string {
  const salt = process.env.SIMIT_SALT;
  if (!salt) throw new Error('SIMIT_SALT no configurada');
  return salt;
}

/**
 * Encripta un texto usando AES-256-GCM
 * @param text Texto plano
 * @returns string en formato iv:authTag:encryptedData (hex)
 */
export function encryptData(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Desencripta un texto usando AES-256-GCM
 * @param encryptedString Cadena cifrada devuelta por encryptData
 * @returns Texto plano
 */
export function decryptData(encryptedString: string): string {
  const key = getEncryptionKey();
  const parts = encryptedString.split(':');
  
  if (parts.length !== 3) {
    throw new Error('El formato del texto encriptado es inválido');
  }
  
  const [ivHex, authTagHex, encryptedDataHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedDataHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Crea un Hash unidireccional (irreversible) usando SHA-256 y un Salt.
 * Ideal para búsquedas exactas e IDs de documentos.
 * @param text Texto plano
 * @returns Hash en formato hexadecimal
 */
export function hashData(text: string): string {
  const salt = getSalt();
  return crypto.createHmac('sha256', salt).update(text).digest('hex');
}
