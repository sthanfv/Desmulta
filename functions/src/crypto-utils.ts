import * as crypto from 'crypto';

const SYMMETRIC_ALGO = 'aes-256-gcm';
const ENC_PREFIX = 'ENC:';

// 🛡️ FIX CR-2: Memoización de la llave derivada para alto desempeño del backend.
let _derivedKey: Buffer | null = null;

function getSymmetricKey(): Buffer {
  if (_derivedKey) return _derivedKey;

  const keyBase = process.env.PII_ENCRYPTION_KEY;
  const salt = process.env.PII_ENCRYPTION_SALT;

  if (!keyBase || !salt) {
    throw new Error(
      '🛡️ [DevSecOps] PII_ENCRYPTION_KEY y PII_ENCRYPTION_SALT no configuradas en el entorno. ' +
        'Ambas son obligatorias para el cifrado PII.'
    );
  }

  // 🛡️ FIX CR-2: Derivación de clave robusta usando PBKDF2 (600,000 iteraciones)
  _derivedKey = crypto.pbkdf2Sync(
    keyBase,
    Buffer.from(salt, 'hex'),
    600_000, // Iteraciones recomendadas NIST 2023
    32, // 32 bytes para clave AES-256
    'sha256'
  );

  return _derivedKey;
}

/**
 * Desencripta texto cifrado mediante AES-256-GCM.
 * Si el texto no está cifrado (no tiene el prefijo ENC:), lo devuelve intacto.
 *
 * @param encryptedString Cadena cifrada con el formato ENC:iv:authTag:encrypted
 * @returns Texto original descifrado
 */
export function decryptSymmetric(encryptedString: string): string {
  try {
    if (!encryptedString || !encryptedString.startsWith(ENC_PREFIX)) {
      return encryptedString;
    }

    const parts = encryptedString.substring(ENC_PREFIX.length).split(':');
    if (parts.length !== 3) {
      return '[Formato Cifrado Inválido]';
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
  } catch (_err) {
    return '[Error de Descifrado - PII Protegida]';
  }
}

/**
 * Encripta texto plano mediante AES-256-GCM.
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
