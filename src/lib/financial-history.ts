// src/lib/financial-history.ts

export interface FinancialYearData {
  /** Salario Mínimo Mensual Legal Vigente del año (COP) */
  smmlv: number;
  /** Tasa de Usura Efectiva Anual (Promedio Anualizado en decimal. ej: 0.28 = 28%) */
  usuraEA: number;
}

/**
 * Histórico financiero de Colombia (2010 - 2026).
 * Utilizado por el motor matemático para calcular multas antiguas con su SMMLV correspondiente,
 * y calcular el interés moratorio compuesto tramo por tramo.
 * Fuentes: MinTrabajo, Banco de la República, SFC.
 */
export const FINANCIAL_HISTORY: Record<number, FinancialYearData> = {
  2010: { smmlv: 515000, usuraEA: 0.28 },
  2011: { smmlv: 535600, usuraEA: 0.30 },
  2012: { smmlv: 566700, usuraEA: 0.31 },
  2013: { smmlv: 589500, usuraEA: 0.31 },
  2014: { smmlv: 616000, usuraEA: 0.29 },
  2015: { smmlv: 644350, usuraEA: 0.29 },
  2016: { smmlv: 689455, usuraEA: 0.31 },
  2017: { smmlv: 737717, usuraEA: 0.32 },
  2018: { smmlv: 781242, usuraEA: 0.30 },
  2019: { smmlv: 828116, usuraEA: 0.28 },
  2020: { smmlv: 877803, usuraEA: 0.27 },
  2021: { smmlv: 908526, usuraEA: 0.25 },
  2022: { smmlv: 1000000, usuraEA: 0.30 },
  2023: { smmlv: 1160000, usuraEA: 0.40 }, // Pico histórico de inflación
  2024: { smmlv: 1300000, usuraEA: 0.31 },
  2025: { smmlv: 1423500, usuraEA: 0.29 },
  2026: { smmlv: 1750905, usuraEA: 0.28 },
};

/**
 * Obtiene el SMDLV (Salario Mínimo Diario) histórico de un año específico.
 */
export function getSMDLVHistorico(anio: number): number {
  const data = FINANCIAL_HISTORY[anio];
  if (!data) {
    // Fallback: Si el año no existe (muy antiguo o muy futuro), usar el año más cercano conocido
    const aniosConocidos = Object.keys(FINANCIAL_HISTORY).map(Number);
    const anioCercano = aniosConocidos.reduce((prev, curr) =>
      Math.abs(curr - anio) < Math.abs(prev - anio) ? curr : prev
    );
    return Number((FINANCIAL_HISTORY[anioCercano].smmlv / 30).toFixed(2));
  }
  return Number((data.smmlv / 30).toFixed(2));
}
