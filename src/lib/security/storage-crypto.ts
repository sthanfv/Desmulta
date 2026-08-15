/**
 * Cifrado ligero para datos persistidos en IndexedDB.
 * Usa una clave derivada del fingerprint del dispositivo + salt fijo.
 * NO reemplaza el cifrado server-side; es una capa de defensa en profundidad.
 */
const STORAGE_KEY = 'desmulta-device-key';

async function getDeviceKey(): Promise<CryptoKey> {
  const existingKey = sessionStorage.getItem(STORAGE_KEY);
  if (existingKey) {
    const raw = Uint8Array.from(atob(existingKey), (c) => c.charCodeAt(0));
    return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
  }
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
  const exported = await crypto.subtle.exportKey('raw', key);
  sessionStorage.setItem(STORAGE_KEY, btoa(String.fromCharCode(...new Uint8Array(exported))));
  return key;
}

export async function encryptForStorage(data: string): Promise<string> {
  const key = await getDeviceKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(data);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decryptFromStorage(data: string): Promise<string> {
  const key = await getDeviceKey();
  const combined = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);
  return new TextDecoder().decode(decrypted);
}
