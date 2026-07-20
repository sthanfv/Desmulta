import { get, set, del } from 'idb-keyval';

const VAULT_KEY = 'desmulta_offline_payload';
const DRAFT_KEY = 'desmulta_draft_payload';

/**
 * 🛡️ FIX H-9: Cifrado AES-GCM para IndexedDB (Zero-Trust Local Storage)
 *
 * En lugar de borrar la PII y causar pérdida de datos al perder conexión,
 * ciframos todo el payload usando una llave simétrica generada dinámicamente
 * que vive únicamente en sessionStorage.
 * Si el usuario cierra la pestaña, la llave muere y la PII en IDB es irrecuperable.
 */

const KEY_STORAGE_ID = 'desmulta_vault_key';

/**
 * Obtiene o genera la llave de cifrado de la sesión actual.
 */
async function getCryptoKey(): Promise<CryptoKey> {
  if (typeof window === 'undefined') {
    throw new Error('Web Crypto solo disponible en cliente');
  }

  const storedKeyRaw = sessionStorage.getItem(KEY_STORAGE_ID);

  if (storedKeyRaw) {
    const rawKey = Uint8Array.from(atob(storedKeyRaw), (c) => c.charCodeAt(0));
    return await window.crypto.subtle.importKey('raw', rawKey, 'AES-GCM', true, [
      'encrypt',
      'decrypt',
    ]);
  }

  // Generar nueva llave y guardarla en SessionStorage (solo en memoria de la sesión actual)
  const key = await window.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);

  const exported = await window.crypto.subtle.exportKey('raw', key);
  const exportedBase64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
  sessionStorage.setItem(KEY_STORAGE_ID, exportedBase64);

  return key;
}

/**
 * Cifra un payload usando AES-GCM
 */
async function encryptPayload(
  payload: Record<string, unknown>
): Promise<{ iv: number[]; data: number[] }> {
  const key = await getCryptoKey();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(payload));

  const encrypted = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

  return {
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encrypted)),
  };
}

/**
 * Descifra un payload usando AES-GCM
 */
async function decryptPayload(encryptedPayload: {
  iv: number[];
  data: number[];
}): Promise<Record<string, unknown> | null> {
  try {
    const key = await getCryptoKey();
    const iv = new Uint8Array(encryptedPayload.iv);
    const data = new Uint8Array(encryptedPayload.data);

    const decrypted = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);

    const decoded = new TextDecoder().decode(decrypted);
    return JSON.parse(decoded);
  } catch (err) {
    console.error('Error descifrando bóveda offline. Es posible que la sesión haya expirado.', err);
    return null; // Llave perdida = PII inaccesible (Fail Closed)
  }
}

export interface OfflinePayload {
  data: { iv: number[]; data: number[] };
  timestamp: number;
}

/**
 * Guarda el formulario cifrado si falla la conexión en el momento de envío.
 * Protege PII con AES-GCM.
 */
export async function saveToVault(payload: Record<string, unknown>): Promise<void> {
  const encrypted = await encryptPayload(payload);
  await set(VAULT_KEY, {
    data: encrypted,
    timestamp: Date.now(),
  });
}

/**
 * Recupera y descifra el paquete offline guardado, si existe y si la llave aún vive.
 */
export async function getFromVault(): Promise<
  { data: Record<string, unknown>; timestamp: number } | undefined
> {
  const stored = await get<OfflinePayload>(VAULT_KEY);
  if (!stored) return undefined;

  const decryptedData = await decryptPayload(stored.data);
  if (!decryptedData) {
    // Si no se pudo descifrar (ej. sessionStorage limpiado), borramos el remanente inútil
    await clearVault();
    return undefined;
  }

  return {
    data: decryptedData,
    timestamp: stored.timestamp,
  };
}

/**
 * Limpia la bóveda una vez que el envío es exitoso.
 */
export async function clearVault(): Promise<void> {
  await del(VAULT_KEY);
}

/**
 * Intenta sincronizar el vault ahora mismo si hay conexión.
 */
export async function hasPendingVaultData(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  const stored = await get<OfflinePayload>(VAULT_KEY);
  return !!stored;
}

/**
 * Guarda el borrador en tiempo real cifrado.
 */
export async function saveDraftToVault(payload: Record<string, unknown>): Promise<void> {
  const encrypted = await encryptPayload(payload);
  await set(DRAFT_KEY, encrypted);
}

/**
 * Recupera el borrador cifrado.
 */
export async function getDraftFromVault(): Promise<Record<string, unknown> | undefined> {
  const stored = await get<{ iv: number[]; data: number[] }>(DRAFT_KEY);
  if (!stored) return undefined;

  const decrypted = await decryptPayload(stored);
  if (!decrypted) {
    await clearDraftFromVault();
    return undefined;
  }
  return decrypted;
}

/**
 * Limpia el borrador de IDB
 */
export async function clearDraftFromVault(): Promise<void> {
  await del(DRAFT_KEY);
}
