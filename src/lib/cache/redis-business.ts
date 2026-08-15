import { Redis } from '@upstash/redis';
import crypto from 'crypto';
import { logger } from '../logger/security-logger';

// Instancia global de Upstash Redis, que ya usa las variables de entorno:
// UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN
const redis = Redis.fromEnv();

/**
 * 🛡️ Genera un hash seguro y determinista para evitar inyecciones en la llave de caché.
 * Ni el frontend ni el usuario conocen este hash, protegiendo a Redis de manipulaciones vía F12.
 */
function generateSecureKey(namespace: string, payload: unknown): string {
  // Ordenar las llaves del objeto para que el hash sea determinista
  // (ej. {a: 1, b: 2} debe tener el mismo hash que {b: 2, a: 1})
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sortObject = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sortObject);
    return (
      Object.keys(obj)
        .sort()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .reduce((result: any, key) => {
          result[key] = sortObject(obj[key]);
          return result;
        }, {})
    );
  };

  const str = JSON.stringify(sortObject(payload)) || 'null';
  const hash = crypto.createHash('sha256').update(str).digest('hex');
  return `desmulta:cache:${namespace}:${hash}`;
}

export const BusinessCache = {
  /**
   * Obtiene un valor de la caché.
   * @param namespace Área de negocio (ej. 'go-engine' | 'simit-scraper')
   * @param payload Objeto que representa la consulta exacta
   */
  async get<T>(namespace: string, payload: unknown): Promise<T | null> {
    try {
      const key = generateSecureKey(namespace, payload);
      const data = await redis.get<T>(key);
      if (data) {
        logger.info(`[BusinessCache] ⚡ HIT (Ahorro) en ${namespace}`);
        return data;
      }
      return null;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.warn(`[BusinessCache] Fallo al leer de Redis (Fallback habilitado)`, {
        error: errMsg,
      });
      return null; // Fallback: si Redis falla temporalmente, retornamos null y el sistema calculará normalmente
    }
  },

  /**
   * Guarda un valor en la caché.
   * @param namespace Área de negocio (ej. 'go-engine' | 'simit-scraper')
   * @param payload Objeto que representa la consulta exacta
   * @param data La respuesta a memorizar
   * @param ttlSeconds Tiempo de vida en segundos
   */
  async set(namespace: string, payload: unknown, data: unknown, ttlSeconds: number): Promise<void> {
    try {
      const key = generateSecureKey(namespace, payload);
      await redis.set(key, data, { ex: ttlSeconds });
      logger.info(`[BusinessCache] 💾 SET en ${namespace} (Expirará en ${ttlSeconds}s)`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.warn(`[BusinessCache] Fallo al escribir en Redis`, { error: errMsg });
    }
  },
};
