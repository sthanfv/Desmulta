/**
 * Tests: analytics-stats — Lógica de cálculo de métricas de negocio.
 * Valida: cálculo de tasas de conversión, manejo de datos vacíos y edge cases.
 *
 * Tests puramente de lógica matemática/transformación de datos, sin Firebase real.
 */

import { describe, it, expect } from 'vitest';

// ── Funciones puras de cálculo (réplica de la lógica en getAnalyticsStats) ───

interface RawStats {
  prospectosTotales: number;
  totalLeads: number;
  totalCases: number;
}

function calcConversionRate(totalLeads: number, totalCases: number): string {
  return totalLeads > 0 ? ((totalCases / totalLeads) * 100).toFixed(1) : '0';
}

function calcConversionGlobal(prospectosTotales: number, totalCases: number): string {
  return prospectosTotales > 0 ? ((totalCases / prospectosTotales) * 100).toFixed(1) : '0';
}

function calcAverageResolutionDays(cases: { createdMs: number; updatedMs: number }[]): string {
  const resolved = cases.filter((c) => c.updatedMs > c.createdMs);
  if (resolved.length === 0) return 'N/A';
  const totalMs = resolved.reduce((acc, c) => acc + (c.updatedMs - c.createdMs), 0);
  const avgDays = Math.round(totalMs / resolved.length / (1000 * 60 * 60 * 24));
  return `${avgDays} día${avgDays !== 1 ? 's' : ''}`;
}

function buildGrowthMap(dates: string[]): Map<string, number> {
  const now = new Date();
  const map = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    map.set(d.toISOString().split('T')[0], 0);
  }
  for (const date of dates) {
    if (map.has(date)) {
      map.set(date, (map.get(date) ?? 0) + 1);
    }
  }
  return map;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('analytics-stats — Tasa de Conversión', () => {
  it('calcula correctamente la tasa de conversión leads → casos', () => {
    expect(calcConversionRate(100, 25)).toBe('25.0');
  });

  it('retorna "0" cuando no hay leads (evita división por cero)', () => {
    expect(calcConversionRate(0, 0)).toBe('0');
  });

  it('maneja correctamente una tasa del 100%', () => {
    expect(calcConversionRate(10, 10)).toBe('100.0');
  });

  it('calcula conversión global incluyendo prospectos directos', () => {
    expect(calcConversionGlobal(500, 25)).toBe('5.0');
  });

  it('retorna "0" para conversión global si no hay prospectos', () => {
    expect(calcConversionGlobal(0, 0)).toBe('0');
  });

  it('maneja floats y los formatea a 1 decimal', () => {
    expect(calcConversionRate(3, 1)).toBe('33.3');
  });
});

describe('analytics-stats — Tiempo Promedio de Resolución', () => {
  const ONE_DAY_MS = 1000 * 60 * 60 * 24;

  it('calcula el promedio correcto en días', () => {
    const cases = [
      { createdMs: 0, updatedMs: ONE_DAY_MS * 10 }, // 10 días
      { createdMs: 0, updatedMs: ONE_DAY_MS * 20 }, // 20 días
    ];
    expect(calcAverageResolutionDays(cases)).toBe('15 días');
  });

  it('retorna "N/A" cuando no hay casos finalizados', () => {
    expect(calcAverageResolutionDays([])).toBe('N/A');
  });

  it('omite casos donde updatedAt no es posterior a createdAt', () => {
    const cases = [
      { createdMs: 1000, updatedMs: 500 }, // inválido: updated ANTES de created
    ];
    expect(calcAverageResolutionDays(cases)).toBe('N/A');
  });

  it('usa singular "día" cuando el promedio es exactamente 1', () => {
    const cases = [
      { createdMs: 0, updatedMs: ONE_DAY_MS }, // exactamente 1 día
    ];
    expect(calcAverageResolutionDays(cases)).toBe('1 día');
  });

  it('usa plural "días" para cualquier valor diferente a 1', () => {
    const cases = [{ createdMs: 0, updatedMs: ONE_DAY_MS * 5 }];
    expect(calcAverageResolutionDays(cases)).toBe('5 días');
  });
});

describe('analytics-stats — Mapa de Crecimiento (últimos 7 días)', () => {
  it('inicializa el mapa con exactamente 7 entradas', () => {
    const map = buildGrowthMap([]);
    expect(map.size).toBe(7);
  });

  it('acumula leads en el día correcto', () => {
    const today = new Date().toISOString().split('T')[0];
    const map = buildGrowthMap([today, today]);
    expect(map.get(today)).toBe(2);
  });

  it('ignora fechas fuera de la ventana de 7 días', () => {
    const oldDate = '2000-01-01';
    const map = buildGrowthMap([oldDate]);
    expect(map.has(oldDate)).toBe(false);
  });

  it('los días sin leads tienen valor 0 (no undefined)', () => {
    const map = buildGrowthMap([]);
    map.forEach((value) => {
      expect(value).toBe(0);
    });
  });
});

// ── Test de validación de stats combinadas ────────────────────────────────────

describe('analytics-stats — Validación de datos combinados', () => {
  it('construye el objeto de stats sin errores para un conjunto de datos normal', () => {
    const raw: RawStats = {
      prospectosTotales: 1000,
      totalLeads: 200,
      totalCases: 50,
    };

    const stats = {
      prospectosTotales: raw.prospectosTotales,
      totalLeads: raw.totalLeads,
      totalCases: raw.totalCases,
      conversionRate: calcConversionRate(raw.totalLeads, raw.totalCases),
      conversionGlobal: calcConversionGlobal(raw.prospectosTotales, raw.totalCases),
      averageResolutionTime: 'N/A',
      growthData: [],
      statusData: [],
      infractionData: [],
    };

    expect(stats.conversionRate).toBe('25.0');
    expect(stats.conversionGlobal).toBe('5.0');
    expect(stats.prospectosTotales).toBe(1000);
    expect(stats.averageResolutionTime).toBe('N/A');
  });

  it('produce stats seguras incluso con todos los valores en cero', () => {
    const raw: RawStats = { prospectosTotales: 0, totalLeads: 0, totalCases: 0 };
    expect(calcConversionRate(raw.totalLeads, raw.totalCases)).toBe('0');
    expect(calcConversionGlobal(raw.prospectosTotales, raw.totalCases)).toBe('0');
  });
});
