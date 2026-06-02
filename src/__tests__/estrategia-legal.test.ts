import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { evaluarCasoTransito } from '@/lib/legal/estrategia-legal';

describe('Motor Heurístico — evaluarCasoTransito', () => {
  beforeEach(() => {
    // Congelamos el tiempo en una fecha fija para que el test nunca caduque
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-09T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debe sugerir PETICION con certeza BAJA si faltan datos de fecha', () => {
    const resultado = evaluarCasoTransito(undefined, false, false);
    expect(resultado.estrategia).toBe('PETICION');
    expect(resultado.certeza).toBe('BAJA');
  });

  it('debe sugerir PRESCRIPCION si pasaron más de 3 años sin cobro coactivo', () => {
    // Fecha: 4 años atrás (Mayo 2022)
    const resultado = evaluarCasoTransito('2022-05-09T10:00:00Z', false, false);
    expect(resultado.estrategia).toBe('PRESCRIPCION');
    expect(resultado.certeza).toBe('ALTA');
  });

  it('debe sugerir TUTELA si es fotomulta con más de 1 año', () => {
    // Fecha: 1.5 años atrás (Noviembre 2024)
    const resultado = evaluarCasoTransito('2024-11-09T10:00:00Z', true, false);
    expect(resultado.estrategia).toBe('TUTELA');
    expect(resultado.certeza).toBe('MEDIA');
  });

  it('debe sugerir PETICION como fallback (ej. comparendo físico reciente)', () => {
    // Fecha: hace 2 meses
    const resultado = evaluarCasoTransito('2026-03-09T10:00:00Z', false, false);
    expect(resultado.estrategia).toBe('PETICION');
    expect(resultado.certeza).toBe('ALTA');
  });
});
