import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger/security-logger';

// Instancia de Upstash Redis utilizando las variables de entorno
const redis = Redis.fromEnv();

/**
 * Obtiene un documento de la caché de Redis. Si no existe (cache miss),
 * ejecuta la función para consultar Firestore y almacena el resultado en Redis.
 * Esta función es Fail-Safe: si Redis falla, cae a Firestore directamente sin interrumpir la ejecución.
 *
 * @param cacheKey Clave única de caché
 * @param fetchFn Función para obtener los datos desde Firestore
 * @param ttlSeconds Tiempo de vida de la caché en segundos (por defecto 300s = 5min)
 */
export async function getCachedDoc<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.info(`[redis-cache] Cache HIT para clave: ${cacheKey}`);
      if (typeof cached === 'string') {
        return JSON.parse(cached) as T;
      }
      return cached as T;
    }
  } catch (error) {
    logger.warn(`[redis-cache] Error al leer de Redis (Fail-Safe: cayendo a Firestore)`, {
      error: String(error),
    });
  }

  // Consultar el origen de datos (Firestore)
  const data = await fetchFn();

  if (data !== undefined && data !== null) {
    try {
      await redis.setex(cacheKey, ttlSeconds, JSON.stringify(data));
      logger.info(`[redis-cache] Cache MISS. Guardando en Redis: ${cacheKey}`);
    } catch (error) {
      logger.warn(`[redis-cache] Error al escribir en Redis`, { error: String(error) });
    }
  }

  return data;
}

/**
 * Invalida (elimina) una clave específica de la caché en Redis.
 *
 * @param cacheKey Clave única de la caché a eliminar
 */
export async function invalidateCache(cacheKey: string): Promise<void> {
  try {
    await redis.del(cacheKey);
    logger.info(`[redis-cache] Caché invalidada para clave: ${cacheKey}`);
  } catch (error) {
    logger.warn(`[redis-cache] Error al invalidar caché en Redis`, { error: String(error) });
  }
}
