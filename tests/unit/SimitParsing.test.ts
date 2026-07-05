import { describe, it, expect } from 'vitest';
import { extractSimitData } from '../../src/lib/utils/ocr-utils';

/**
 * Unit Tests: SIMIT OCR Parsing Logic — Desmulta v8.4.0
 * 
 * Este suite valida que las expresiones regulares de extracción de datos 
 * funcionen correctamente ante diferentes variaciones de texto devueltas 
 * por el motor de OCR tras analizar capturas de pantalla del SIMIT.
 */

describe('SIMIT Data Extraction (OCR Logic)', () => {
  
  it('should correctly extract ID and Name from standard format', () => {
    const rawText = `
      ESTADO DE CUENTA SIMIT
      NOMBRE: JUAN PERÉZ MALDONADO
      CEDULA: 1090458665
      CIUDAD: BOGOTÁ
    `;
    const result = extractSimitData(rawText);
    expect(result.extractedId).toBe('1090458665');
    expect(result.extractedName).toBe('JUAN PERÉZ MALDONADO');
  });

  it('should handle "C.C." prefix and lowercase Documento', () => {
    const rawText = `
      Información del Ciudadano:
      INFRACTOR : SANDRA MILENA ROJAS
      C.C. 52123456
      Dirección de residencia...
    `;
    const result = extractSimitData(rawText);
    expect(result.extractedId).toBe('52123456');
    expect(result.extractedName).toBe('SANDRA MILENA ROJAS');
  });

  it('should handle "IDENTIFICACION" and multi-line noise', () => {
    const rawText = `
      CONSULTA PÚBLICA
      IDENTIFICACION: 37888999
      PROPIETARIO: CARLOS ALBERTO GOMEZ 
      DOCUMENTO IDENTIDAD...
    `;
    const result = extractSimitData(rawText);
    expect(result.extractedId).toBe('37888999');
    expect(result.extractedName).toBe('CARLOS ALBERTO GOMEZ');
  });

  it('should return nulls when no data is present', () => {
    const rawText = `Solo texto aleatorio sin etiquetas de simit.`;
    const result = extractSimitData(rawText);
    expect(result.extractedId).toBe(null);
    expect(result.extractedName).toBe(null);
  });

  it('should handle names with accents and special characters (Ñ)', () => {
    const rawText = `
      CIUDADANO: NUÑEZ IBAÑEZ CASTAÑO
      CEDULA: 12345678
    `;
    const result = extractSimitData(rawText);
    expect(result.extractedName).toBe('NUÑEZ IBAÑEZ CASTAÑO');
  });
});
