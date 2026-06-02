import { get, set, del } from 'idb-keyval';

const VAULT_KEY = 'desmulta_offline_payload';
const DRAFT_KEY = 'desmulta_draft_payload';

export interface OfflinePayload {
  data: Record<string, unknown>;
  timestamp: number;
}

/**
 * Guarda el formulario si falla la conexión en el momento de envío.
 */
export async function saveToVault(payload: Record<string, unknown>): Promise<void> {
  await set(VAULT_KEY, {
    data: payload,
    timestamp: Date.now(),
  });
}

/**
 * Recupera el paquete offline guardado, si existe.
 */
export async function getFromVault(): Promise<OfflinePayload | undefined> {
  return await get(VAULT_KEY);
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
  const stored = await getFromVault();
  return !!stored;
}

/**
 * Guarda el borrador en tiempo real (progreso del formulario offline en vivo).
 */
export async function saveDraftToVault(payload: Record<string, unknown>): Promise<void> {
  await set(DRAFT_KEY, payload);
}

/**
 * Recupera el borrador en vivo de la consulta.
 */
export async function getDraftFromVault(): Promise<Record<string, unknown> | undefined> {
  return await get(DRAFT_KEY);
}

/**
 * Limpia el borrador en progreso de IDB
 */
export async function clearDraftFromVault(): Promise<void> {
  await del(DRAFT_KEY);
}
