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
import { logger } from '@/lib/logger/security-logger';
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

/**
 * 🛡️ ENCRIPTACIÓN SIMÉTRICA (AES-256-GCM)
 * Se usa para guardar PII (cédula) en Firestore de forma que solo el backend
 * pueda leerla para el panel de administración.
 */
const SYMMETRIC_ALGO = 'aes-256-gcm';
const ENC_PREFIX = 'ENC:';

// 🛡️ FIX CR-2: Memoización de la llave derivada para alto desempeño del backend
let _derivedKey: Buffer | null = null;

function getSymmetricKey(): Buffer {
  if (_derivedKey) return _derivedKey;

  const keyBase = process.env.PII_ENCRYPTION_KEY;
  const salt = process.env.PII_ENCRYPTION_SALT;

  if (!keyBase || !salt) {
    throw new Error(
      '🛡️ [DevSecOps] PII_ENCRYPTION_KEY y PII_ENCRYPTION_SALT no configuradas en el entorno. ' +
        'Ambas son obligatorias para el cifrado PII. Genera claves con: ' +
        "node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }

  // 🛡️ FIX CR-2: Derivación de clave robusta usando PBKDF2 (600,000 iteraciones)
  // en lugar de sha256 simple, neutralizando ataques de GPU por fuerza bruta.
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
 * Encripta texto plano y devuelve un string seguro formateado.
 * @param text Texto plano a encriptar
 * @returns String con formato `ENC:iv:authTag:cifrado`
 */
export function encryptSymmetric(text: string): string {
  if (!text) return text;

  const iv = crypto.randomBytes(12); // IV estándar de 12 bytes para GCM
  const key = getSymmetricKey();
  const cipher = crypto.createCipheriv(SYMMETRIC_ALGO, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${ENC_PREFIX}${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Desencripta texto cifrado. Si el texto no está cifrado (no tiene el prefijo ENC:),
 * lo devuelve intacto para mantener compatibilidad con casos antiguos.
 * @param encryptedString String generado por encryptSymmetric
 * @returns Texto plano desencriptado
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
  } catch (err) {
    logger.error(
      '[Crypto] Error de descifrado simétrico (posible cambio de clave o datos corruptos):',
      { error: String(err) }
    );
    return '[Error de Descifrado - PII Protegida]';
  }
}
