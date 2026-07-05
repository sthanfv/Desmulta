import { describe, it, expect } from 'vitest';
import { analyzeTechnicalCase } from '../lib/legal/triage-engine';

describe('🤖 Motor de Triage Técnico v1.1.0', () => {
  it('✅ Debe retornar un borrador limpio y sin triggers para textos vacíos (Zero Encoder)', () => {
    const result = analyzeTechnicalCase('');
    expect(result.priority).toBe('NORMAL');
    expect(result.triggers.length).toBe(0);
    // Verificamos que el doble encodeURIComponent ha sido purgado (no incluye %20)
    expect(result.technicalDraft.includes('%20')).toBe(false);
    expect(result.technicalDraft).toBe(
      'Hola equipo Desmulta, deseo iniciar mi estudio de viabilidad gratuito.'
    );
  });

  it('🚨 Debe detectar Cobro Coactivo con Prioridad ALTA', () => {
    const result = analyzeTechnicalCase('EXPEDIENTE EN COBRO COACTIVO PARA EMBARGO');
    expect(result.priority).toBe('ALTA');
    expect(result.triggers).toContain('COBRO_COACTIVO');
    expect(result.technicalDraft).toContain('ALERTA');
  });

  it('📷 Debe clasificar FotoMultas en Prioridad MEDIA (sin elevación errónea)', () => {
    const result = analyzeTechnicalCase('DETECCION SAIT CAMARA FOTOMULTA');
    expect(result.priority).toBe('MEDIA');
    expect(result.triggers).toContain('FOTOMULTA');
  });

  it('🍷 Debe detectar Alcoholemia y escalar a Prioridad ALTA', () => {
    const result = analyzeTechnicalCase('Multa por grado resolucion embriaguez');
    expect(result.priority).toBe('ALTA');
    expect(result.triggers).toContain('ALCOHOLEMIA');
    expect(result.triggers).toContain('SUSPENSION_LICENCIA');
    expect(result.technicalDraft).toContain('GRAVEDAD');
  });

  it('⚠️ Debe alertar sobre Acuerdos de Pago Incumplidos', () => {
    const result = analyzeTechnicalCase(
      'Reporte por incumplimiento de un Acuerdo de PAGO en transito'
    );
    expect(result.priority).toBe('ALTA');
    expect(result.triggers).toContain('INCUMPLIMIENTO_ACUERDO');
    expect(result.technicalDraft).toContain('ejecución inminente');
  });
});
