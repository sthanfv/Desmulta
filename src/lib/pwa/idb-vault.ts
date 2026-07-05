import { get, set, del } from 'idb-keyval';

const VAULT_KEY = 'desmulta_offline_payload';
const DRAFT_KEY = 'desmulta_draft_payload';

/**
 * Campos PII que NUNCA deben persistirse en IndexedDB sin cifrado.
 * Cumple con Ley 1581 de 2012 (Colombia) y principio de minimización de datos GDPR.
 * Los datos en este array se eliminan del payload antes de guardarlo.
 */
const PII_FIELDS: string[] = [
  'ocrRawText',
  'cedula',
  'nombre',
  'contacto',
  'celular',
  'email',
  'emailPersonal',
  'placa',
];

/**
 * Filtra los campos PII de un payload antes de persistirlo en IndexedDB.
 * Los datos eliminados permanecen únicamente en el estado de React en memoria.
 *
 * @param payload - Objeto original con posibles campos PII
 * @returns Copia del objeto sin los campos PII definidos en PII_FIELDS
 */
function sanitizePiiFromPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...payload };
  for (const field of PII_FIELDS) {
    if (field in sanitized) {
      delete sanitized[field];
    }
  }
  return sanitized;
}

export interface OfflinePayload {
  data: Record<string, unknown>;
  timestamp: number;
}

/**
 * Guarda el formulario si falla la conexión en el momento de envío.
 * Los campos PII se filtran antes de la persistencia en IndexedDB.
 *
 * @param payload - Datos del formulario a guardar offline
 */
export async function saveToVault(payload: Record<string, unknown>): Promise<void> {
  const sanitized = sanitizePiiFromPayload(payload);
  await set(VAULT_KEY, {
    data: sanitized,
    timestamp: Date.now(),
  });
}

/**
 * Recupera el paquete offline guardado, si existe.
 * Los datos recuperados no contienen PII (fueron filtrados al guardar).
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
 * Los campos PII se excluyen de la persistencia para proteger datos sensibles del usuario.
 * Los datos PII permanecen en el estado de React mientras la sesión esté activa.
 *
 * @param payload - Estado parcial del formulario en curso
 */
export async function saveDraftToVault(payload: Record<string, unknown>): Promise<void> {
  const sanitized = sanitizePiiFromPayload(payload);
  await set(DRAFT_KEY, sanitized);
}

/**
 * Recupera el borrador en vivo de la consulta.
 * Los datos recuperados no contienen PII (fueron filtrados al guardar).
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
