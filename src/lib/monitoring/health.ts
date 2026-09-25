/**
 * Chequeo de salud para el monitor externo (UptimeRobot u otro).
 *
 * Estándar de la industria: el monitor externo solo necesita saber si el sitio
 * responde y si su dependencia crítica (Firestore) funciona. No se exponen detalles
 * internos (versiones, URLs, errores) porque la ruta es pública.
 *
 * El resultado se guarda en memoria unos segundos para que visitas repetidas a la
 * ruta no gasten lecturas de Firestore.
 */

export type HealthStatus = 'ok' | 'degradado';

export interface HealthReport {
  status: HealthStatus;
  checks: { firestore: 'ok' | 'falla' };
  timestamp: string;
}

export const HEALTH_CACHE_MS = 30_000;
// 8 s: el primer acceso en frío (función recién arrancada) abre la conexión con Firestore y
// puede pasar de 3 s; con un límite menor el monitor daría falsas alarmas.
export const HEALTH_TIMEOUT_MS = 8_000;

let cache: { report: HealthReport; expiresAt: number } | null = null;

/** Rechaza si la promesa tarda más de `ms`. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/**
 * Ejecuta el chequeo (o devuelve el guardado si sigue vigente).
 * @param probeFirestore Función que hace una lectura mínima en Firestore.
 * @param now Reloj inyectable para pruebas.
 */
export async function getHealthReport(
  probeFirestore: () => Promise<unknown>,
  now: () => number = Date.now
): Promise<HealthReport> {
  if (cache && cache.expiresAt > now()) return cache.report;

  let firestore: 'ok' | 'falla' = 'ok';
  try {
    await withTimeout(probeFirestore(), HEALTH_TIMEOUT_MS);
  } catch {
    firestore = 'falla';
  }

  const report: HealthReport = {
    status: firestore === 'ok' ? 'ok' : 'degradado',
    checks: { firestore },
    timestamp: new Date(now()).toISOString(),
  };
  cache = { report, expiresAt: now() + HEALTH_CACHE_MS };
  return report;
}

/** Solo para pruebas: limpia el resultado guardado. */
export function resetHealthCache(): void {
  cache = null;
}
