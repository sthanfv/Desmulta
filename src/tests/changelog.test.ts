import { describe, it, expect } from 'vitest';
import { changelogHistory, getTagStyle } from '../lib/changelog';

describe('📜 UI/UX: Sistema de Changelog de Alta Precisión', () => {
  it('✅ El diccionario de datos debe estar estructurado y no vacío', () => {
    expect(changelogHistory.length).toBeGreaterThan(0);

    // Verificamos el release más reciente
    const latestRelease = changelogHistory[0];
    expect(latestRelease).toHaveProperty('version');
    expect(latestRelease).toHaveProperty('date');
    expect(latestRelease).toHaveProperty('title');
    expect(latestRelease.changes.length).toBeGreaterThan(0);
  });

  it('✅ Las versiones deben seguir el formato semántico estricto (X.Y.Z)', () => {
    // Regex para validar formato semántico (ej: 2.8.8)
    const semverRegex = /^\d+\.\d+\.\d+$/;

    changelogHistory.forEach((release) => {
      expect(release.version).toMatch(semverRegex);
    });
  });

  it('✅ Las etiquetas de cambios deben devolver un estilo CSS válido', () => {
    const featureStyle = getTagStyle('NUEVA FUNCIÓN');
    const securityStyle = getTagStyle('SEGURIDAD');
    const optimizationStyle = getTagStyle('OPTIMIZACIÓN');

    // Verificamos que contengan clases de Tailwind de colores correctos
    expect(featureStyle).toContain('emerald');
    expect(securityStyle).toContain('violet');
    expect(optimizationStyle).toContain('blue');
  });
});
