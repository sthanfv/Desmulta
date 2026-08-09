/**
 * Motor Estocástico (Stochastic Engine) para Evasión Anti-Bot (WAF)
 * Este módulo se encarga de introducir caos matemático y comportamiento "humano"
 * a los CRON jobs que se ejecutan a intervalos regulares.
 */

const BOGOTA_TZ = 'America/Bogota';
const ACTIVE_START_HOUR = 7; // 07:00 AM
const ACTIVE_END_HOUR = 21;  // 21:59 PM

/**
 * Obtiene la hora actual en la zona horaria de Bogotá (0-23)
 * Independiente de dónde esté el servidor (Vercel corre en UTC por defecto)
 */
export function getBogotaHour(date: Date): number {
  const dateStr = date.toLocaleString('en-US', { timeZone: BOGOTA_TZ });
  const localDate = new Date(dateStr);
  return localDate.getHours();
}

/**
 * Toma la decisión de si el worker debe proceder o abortar silenciosamente.
 * @param date Fecha a evaluar (usualmente new Date())
 * @param probability Probabilidad de ejecución (0.0 a 1.0). Ej: 0.05 para 5%
 * @returns { execute: boolean, reason?: string }
 */
export function shouldExecuteWorker(date: Date, probability: number): { execute: boolean; reason?: string } {
  const currentHour = getBogotaHour(date);

  // 1. Compuerta de Tiempo (Time-Gating)
  // No ejecutar en la madrugada para evitar anomalías
  if (currentHour < ACTIVE_START_HOUR || currentHour > ACTIVE_END_HOUR) {
    return { execute: false, reason: `fuera_de_horario_habito (${currentHour}h)` };
  }

  // 2. Tirada de Dado (Stochastic Jitter)
  const roll = Math.random();
  if (roll > probability) {
    return { execute: false, reason: `salto_estocastico (${roll.toFixed(3)} > ${probability})` };
  }

  return { execute: true, reason: 'ejecucion_aleatoria_aprobada' };
}

/**
 * Genera un tamaño de lote dinámico para evitar patrones fijos de consultas
 * @param min Mínimo de cédulas (incluido)
 * @param max Máximo de cédulas (incluido)
 */
export function getRandomBatchSize(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
