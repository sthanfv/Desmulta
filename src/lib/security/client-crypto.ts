/**
 * 🛡️ Módulo de Criptografía E2EE (Client-Side)
 * Utiliza Web Crypto API para encriptar PII sensible (Zero-Trust) antes de abandonar el navegador.
 */

function pemToArrayBuffer(pem: string): ArrayBuffer {
  // Limpia cabeceras, footers y espacios de la llave PEM
  const b64 = pem.replace(/(-----(BEGIN|END) PUBLIC KEY-----|\s)/g, '');
  const binaryOutput = window.atob(b64);
  const buffer = new Uint8Array(binaryOutput.length);
  for (let i = 0; i < binaryOutput.length; i++) {
    buffer[i] = binaryOutput.charCodeAt(i);
  }
  return buffer.buffer;
}

/**
 * Encripta un payload JSON en el cliente usando la clave RSA pública.
 * @param payload Objeto con información sensible (ej: { cedula, contacto })
 * @returns Cadena en Base64 con el criptograma
 */
export async function encryptE2EPayload(payload: object): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error(
      'encryptE2EPayload solo debe ejecutarse en un entorno de Navegador (Client Components).'
    );
  }

  const pemKey = (process.env.NEXT_PUBLIC_RSA_KEY || '').replace(/\\n/g, '\n');
  if (!pemKey || pemKey.length === 0) {
    throw new Error('🛡️ [DevSecOps] NEXT_PUBLIC_RSA_KEY ausente. Imposible establecer Túnel E2EE.');
  }

  const binaryDer = pemToArrayBuffer(pemKey);
  const publicKey = await window.crypto.subtle.importKey(
    'spki',
    binaryDer,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    true,
    ['encrypt']
  );

  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload));

  const encryptedBuffer = await window.crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, data);

  const encryptedBytes = new Uint8Array(encryptedBuffer);
  let binaryString = '';
  // Previene Stack Overflow en navegadores limitados al no usar spread operator en arrays
  for (let i = 0; i < encryptedBytes.byteLength; i++) {
    binaryString += String.fromCharCode(encryptedBytes[i]);
  }
  return window.btoa(binaryString);
}

/**
 * Genera un hash SHA-256 de una cadena para identificación Zero-PII.
 *
 * ⚠️ EXCLUSIVA DEL NAVEGADOR: Utiliza `window.crypto.subtle` (Web Crypto API).
 * No importar desde Server Components ni rutas de API — usar `hashPII` de server-crypto en su lugar.
 */
export async function hashSHA256(text: string): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error(
      'hashSHA256 es exclusiva de entornos de navegador (Client Components). En el servidor usar hashPII() de server-crypto.'
    );
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
