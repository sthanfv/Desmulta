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

  SecurityLogger.info(`[SyncQueue] Procesando ${queue.length} elementos en cola.`);

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

async function incrementRetryCount(id: string): Promise<void> {
  const queue = await getSyncQueue();
  const itemIndex = queue.findIndex((item) => item.id === id);
  if (itemIndex > -1) {
    queue[itemIndex].retryCount += 1;
    await set(SYNC_QUEUE_KEY, queue);
  }
}
