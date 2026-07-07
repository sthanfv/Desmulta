import { get, set } from 'idb-keyval';
import { SecurityLogger } from '@/lib/logger/security-logger';

const SYNC_QUEUE_KEY = 'desmulta_sync_queue';

export interface SyncPayload {
  id: string;
  endpoint: string;
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

export async function enqueueSync(endpoint: string, data: Record<string, unknown>): Promise<void> {
  const queue = await getSyncQueue();
  const payload: SyncPayload = {
    id: crypto.randomUUID(),
    endpoint,
    data,
    timestamp: Date.now(),
    retryCount: 0,
  };

  queue.push(payload);
  await set(SYNC_QUEUE_KEY, queue);
  SecurityLogger.info('[SyncQueue] Encolado payload para sincronización offline', {
    endpoint,
    id: payload.id,
  });
}

export async function getSyncQueue(): Promise<SyncPayload[]> {
  const queue = await get<SyncPayload[]>(SYNC_QUEUE_KEY);
  return queue || [];
}

export async function removeFromQueue(id: string): Promise<void> {
  const queue = await getSyncQueue();
  const updatedQueue = queue.filter((item) => item.id !== id);
  await set(SYNC_QUEUE_KEY, updatedQueue);
}

export async function processSyncQueue(
  processor: (payload: SyncPayload) => Promise<boolean>
): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return; // No intentar sincronizar sin internet
  }

  const queue = await getSyncQueue();
  if (queue.length === 0) return;

  // Jitter Anti-Estampida: Aleatoriza el inicio de la sincronización cuando vuelve el internet
  const jitter = Math.floor(Math.random() * 2000);
  SecurityLogger.info(`[SyncQueue] Procesando ${queue.length} elementos en cola. Aplicando Jitter de ${jitter}ms.`);
  await new Promise((resolve) => setTimeout(resolve, jitter));

  for (const item of queue) {
    try {
      const success = await processor(item);
      if (success) {
        await removeFromQueue(item.id);
        SecurityLogger.info(`[SyncQueue] Sincronización exitosa para ID: ${item.id}`);
      } else {
        await incrementRetryCount(item.id);
      }
    } catch (error) {
      SecurityLogger.error(`[SyncQueue] Error procesando elemento ID: ${item.id}`, error);
      await incrementRetryCount(item.id);
    }
  }
}

const MAX_RETRIES = 5;

async function incrementRetryCount(id: string): Promise<void> {
  const queue = await getSyncQueue();
  const itemIndex = queue.findIndex((item) => item.id === id);
  if (itemIndex > -1) {
    queue[itemIndex].retryCount += 1;

    if (queue[itemIndex].retryCount >= MAX_RETRIES) {
      SecurityLogger.warn(`[SyncQueue] Ítem descartado tras ${MAX_RETRIES} intentos`, { id });
      queue.splice(itemIndex, 1);
    }

    await set(SYNC_QUEUE_KEY, queue);
  }
}
