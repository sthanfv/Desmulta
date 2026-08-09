import { getBogotaHour, shouldExecuteWorker, getRandomBatchSize } from '../stochastic-engine';

describe('Motor Estocástico (Stochastic Engine)', () => {
  describe('getBogotaHour', () => {
    it('debe devolver la hora correcta en Bogotá independientemente de la hora UTC', () => {
      // 12:00 PM UTC = 07:00 AM Bogotá (UTC-5)
      const utcDate = new Date(Date.UTC(2026, 7, 9, 12, 0, 0)); 
      expect(getBogotaHour(utcDate)).toBe(7);
      
      // 03:00 AM UTC (día siguiente) = 10:00 PM Bogotá
      const utcDateNight = new Date(Date.UTC(2026, 7, 10, 3, 0, 0));
      expect(getBogotaHour(utcDateNight)).toBe(22);
    });
  });

  describe('shouldExecuteWorker', () => {
    // 08:00 AM Bogotá = 13:00 UTC
    const activeDate = new Date(Date.UTC(2026, 7, 9, 13, 0, 0));
    
    // 03:00 AM Bogotá = 08:00 UTC
    const inactiveDate = new Date(Date.UTC(2026, 7, 9, 8, 0, 0));

    it('NUNCA debe ejecutar fuera de la compuerta de tiempo (Madrugada)', () => {
      // Incluso con 100% de probabilidad, en la madrugada debe abortar
      const result = shouldExecuteWorker(inactiveDate, 1.0);
      expect(result.execute).toBe(false);
      expect(result.reason).toContain('fuera_de_horario_habito');
    });

    it('debe ejecutar siempre si está en horario hábil y probabilidad es 1.0', () => {
      const result = shouldExecuteWorker(activeDate, 1.0);
      expect(result.execute).toBe(true);
      expect(result.reason).toBe('ejecucion_aleatoria_aprobada');
    });

    it('NUNCA debe ejecutar si la probabilidad es 0.0', () => {
      const result = shouldExecuteWorker(activeDate, 0.0);
      expect(result.execute).toBe(false);
      expect(result.reason).toContain('salto_estocastico');
    });

    it('la distribución de la tirada del dado debe converger hacia la probabilidad dada', () => {
      let executions = 0;
      const iterations = 10000;
      const targetProbability = 0.15; // 15%

      for (let i = 0; i < iterations; i++) {
        if (shouldExecuteWorker(activeDate, targetProbability).execute) {
          executions++;
        }
      }

      const experimentalProbability = executions / iterations;
      // Tolerar un error estadístico del 1.5%
      expect(experimentalProbability).toBeGreaterThan(targetProbability - 0.015);
      expect(experimentalProbability).toBeLessThan(targetProbability + 0.015);
    });
  });

  describe('getRandomBatchSize', () => {
    it('debe generar tamaños de lote siempre dentro del rango especificado', () => {
      const min = 1;
      const max = 4;
      
      for (let i = 0; i < 100; i++) {
        const size = getRandomBatchSize(min, max);
        expect(size).toBeGreaterThanOrEqual(min);
        expect(size).toBeLessThanOrEqual(max);
        expect(Number.isInteger(size)).toBe(true);
      }
    });
  });
});
