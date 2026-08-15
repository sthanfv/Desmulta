/**
 * @deprecated ⚠️ WARNING (COMPLIANCE & LEGAL) ⚠️
 *
 * Motor Estocástico (Stochastic Engine) INHABILITADO.
 *
 * Este módulo se diseñó para la evasión Anti-Bot (WAF) asociada al scraper
 * automatizado del portal SIMIT. Dado que SIMIT prohíbe explícitamente el scraping,
 * el uso de este motor acarrea riesgos legales inaceptables para el negocio.
 *
 * TODAS las funciones de este archivo están marcadas como deprecadas y han sido
 * desactivadas. No deben ser usadas en ninguna nueva implementación.
 */

const BOGOTA_TZ = 'America/Bogota';

/**
 * @deprecated ELIMINADO POR COMPLIANCE ANTI-SCRAPING
 */
export function getBogotaHour(date: Date): number {
  const dateStr = date.toLocaleString('en-US', { timeZone: BOGOTA_TZ });
  const localDate = new Date(dateStr);
  return localDate.getHours();
}

/**
 * @deprecated ELIMINADO POR COMPLIANCE ANTI-SCRAPING
 * Retorna siempre { execute: false } para bloquear cualquier intento de ejecución.
 */
export function shouldExecuteWorker(
  _date: Date,
  _probability: number
): { execute: boolean; reason?: string } {
  console.warn('[COMPLIANCE] Intento de usar Motor Estocástico bloqueado.');
  return { execute: false, reason: 'bloqueo_por_compliance_legal' };
}

/**
 * @deprecated ELIMINADO POR COMPLIANCE ANTI-SCRAPING
 * Retorna siempre 0.
 */
export function getRandomBatchSize(_min: number, _max: number): number {
  console.warn('[COMPLIANCE] Intento de generar lotes de scraping bloqueado.');
  return 0;
}
