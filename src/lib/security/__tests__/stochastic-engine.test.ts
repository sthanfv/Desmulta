import { shouldExecuteWorker, getRandomBatchSize } from '../stochastic-engine';

describe('Motor Estocástico (Stochastic Engine) - DEPRECATED', () => {
  it('shouldExecuteWorker siempre debe retornar execute: false por cumplimiento legal', () => {
    const result = shouldExecuteWorker(new Date(), 1.0);
    expect(result.execute).toBe(false);
    expect(result.reason).toBe('bloqueo_por_compliance_legal');
  });

  it('getRandomBatchSize siempre debe retornar 0 por cumplimiento legal', () => {
    expect(getRandomBatchSize(1, 10)).toBe(0);
  });
});
