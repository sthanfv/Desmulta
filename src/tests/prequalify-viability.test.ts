import { describe, it, expect } from 'vitest';
import { evaluateViability } from '../components/forms/PreQualifyWidget';

describe('⚖️ Motor de Evaluación del Pre-calificador Inteligente', () => {
  it('🍷 Debe clasificar las multas de alcoholemia con viabilidad Baja (15%)', () => {
    const result = evaluateViability('alcohol', 'medio', 'casualidad');
    expect(result.success).toBe(false);
    expect(result.probability).toBe('Baja Probabilidad (15%)');
    expect(result.title).toBe('Caso de Alta Complejidad');
    expect(result.desc).toContain('alcoholemia');
  });

  it('⏳ Debe clasificar multas antiguas (>3 años) con viabilidad Alta (95%) para Prescripción', () => {
    const result = evaluateViability('agente', 'antiguo', 'notificado');
    expect(result.success).toBe(true);
    expect(result.probability).toBe('Alta Probabilidad (95%)');
    expect(result.title).toBe('Alta Probabilidad de Éxito');
    expect(result.desc).toContain('antigüedad');
  });

  it('📷 Debe clasificar fotomultas no notificadas formalmente con viabilidad Alta (85%)', () => {
    // Caso por casualidad
    const result1 = evaluateViability('foto', 'reciente', 'casualidad');
    expect(result1.success).toBe(true);
    expect(result1.probability).toBe('Alta Probabilidad (85%)');
    expect(result1.title).toBe('Caso Altamente Viable');
    expect(result1.desc).toContain('debido proceso');

    // Caso por cobro coactivo/embargo
    const result2 = evaluateViability('foto', 'medio', 'embargo');
    expect(result2.success).toBe(true);
    expect(result2.probability).toBe('Alta Probabilidad (85%)');
    expect(result2.desc).toContain('Corte Constitucional');
  });

  it('🚨 Debe clasificar multas recientes notificadas formalmente con viabilidad Baja (20%)', () => {
    const result = evaluateViability('agente', 'reciente', 'notificado');
    expect(result.success).toBe(false);
    expect(result.probability).toBe('Baja Probabilidad (20%)');
    expect(result.title).toBe('Viabilidad Preliminar Limitada');
    expect(result.desc).toContain('revisará su caso manualmente');
  });

  it('⚙️ Debe clasificar otros escenarios en viabilidad Moderada (60%)', () => {
    const result = evaluateViability('agente', 'medio', 'notificado');
    expect(result.success).toBe(true);
    expect(result.probability).toBe('Viabilidad Moderada (60%)');
    expect(result.title).toBe('Caso Viable bajo Estudio');
    expect(result.desc).toContain('omisiones administrativas');
  });
});
