/**
 * Tests Unitarios: Motor de Lógica Difusa
 * MANDATO-FILTRO: Validación exhaustiva de algoritmos core.
 */
import { describe, it, expect } from 'vitest';
import { getLevenshteinDistance, isFuzzyMatch } from '../lib/utils/string-matching';

describe('Motor de Lógica Difusa (Fuzzy Matching)', () => {
  it('Calcula correctamente la distancia de Levenshtein', () => {
    expect(getLevenshteinDistance('cobro', 'cobro')).toBe(0);
    expect(getLevenshteinDistance('c0bro', 'cobro')).toBe(1); // 1 sustitución
    expect(getLevenshteinDistance('coactivo', 'coactiv')).toBe(1); // 1 eliminación
    expect(getLevenshteinDistance('sim1t', 'simit')).toBe(1);
  });

  it('Detecta coincidencias con tolerancia', () => {
    expect(isFuzzyMatch('C0BR0', 'cobro', 2)).toBe(true); // Soporta 2 errores
    expect(isFuzzyMatch('MULTA', 'mula', 1)).toBe(true);
    expect(isFuzzyMatch('FOTOMULTA', 'foto', 2)).toBe(false); // Demasiado lejos
  });

  it('Maneja correctamente entradas vacías o nulas', () => {
    expect(isFuzzyMatch('', 'test')).toBe(false);
    // @ts-expect-error Probando robustez en runtime con null
    expect(isFuzzyMatch(null, 'test', 1)).toBe(false);
  });
});
