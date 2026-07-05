import { describe, it, expect } from 'vitest';
import { OCRSanitizer, PrescriptionEngine } from '@/lib/legal/prescription-engine';
import { LegalStatus } from '@/lib/definitions';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS DE TEST
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deriva el emoji del semáforo tal como lo renderiza `telegram.ts`.
 */
const getSemaforoEmoji = (isViable: boolean): string => (isViable ? '🟢' : '🔴');

/**
 * Genera un texto de infracción con una fecha configurable.
 */
const buildOcrText = (fechaISO: string): string => {
  const [year, month, day] = fechaISO.split('-');
  return `SECRETARIA DE TRANSITO NUMERO DE COMPARENDO 12345 FECHA INFRACCION ${day}/${month}/${year} VALOR A PAGAR 450000`;
};

/**
 * Genera un texto OCR simulando un comparendo ELECTRÓNICO (fotomulta).
 */
const buildElectronicOcrText = (fechaISO: string): string => {
  const [year, month, day] = fechaISO.split('-');
  return `SECRETARIA DE TRANSITO FOTOMULTA CAMARA DE DETECCION ELECTRONICA FECHA INFRACCION ${day}/${month}/${year} VALOR A PAGAR 300000`;
};

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1: OCRSanitizer — Saneamiento de texto crudo
// ─────────────────────────────────────────────────────────────────────────────
describe('OCRSanitizer: Saneamiento y extracción de datos', () => {
  it('debe normalizar texto a mayúsculas y eliminar saltos de línea', () => {
    const raw = `secretaria de transito\ninfraccion de transito`;
    const resultado = OCRSanitizer.normalizeText(raw);
    expect(resultado).toBe('SECRETARIA DE TRANSITO INFRACCION DE TRANSITO');
  });

  it('debe estandarizar formatos de fecha a DD/MM/YYYY', () => {
    const raw = 'FECHA 15-03-2020 y OTRA FECHA 20.06.2019';
    const resultado = OCRSanitizer.normalizeText(raw);
    expect(resultado).toContain('15/03/2020');
    expect(resultado).toContain('20/06/2019');
  });

  it('debe extraer correctamente todas las fechas únicas del texto normalizado', () => {
    const normalizado = 'FECHA 15/03/2020 OTRO 15/03/2020 OTRA 01/01/2022';
    const fechas = OCRSanitizer.extractDates(normalizado);
    expect(fechas).toHaveLength(2); // Deben ser únicas
    expect(fechas).toContain('15/03/2020');
    expect(fechas).toContain('01/01/2022');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2: PrescriptionEngine — Evaluación de Heurísticas Técnicas
// ─────────────────────────────────────────────────────────────────────────────
describe('PrescriptionEngine: Evaluación de heurísticas (Ley 769 & C-038)', () => {
  it('debe detectar PRESCRIPCIÓN para infracciones con más de 3 años (Art. 159)', () => {
    const fechaHace4Anos = new Date();
    fechaHace4Anos.setFullYear(fechaHace4Anos.getFullYear() - 4);
    const texto = OCRSanitizer.normalizeText(
      buildOcrText(fechaHace4Anos.toISOString().split('T')[0])
    );
    const fechas = OCRSanitizer.extractDates(texto);

    const resultado = PrescriptionEngine.evaluate(texto, fechas);

    expect(resultado.status).toBe<LegalStatus>('PRESCRITO');
    expect(resultado.isViable).toBe(true);
    expect(resultado.technicalDictum).toContain('inconsistencias temporales');
    expect(getSemaforoEmoji(resultado.isViable ?? false)).toBe('🟢');
  });

  it('debe detectar CADUCIDAD para infracciones entre 1 y 3 años sin resolución (Art. 161)', () => {
    const fechaHace2Anos = new Date();
    fechaHace2Anos.setFullYear(fechaHace2Anos.getFullYear() - 2);
    const texto = OCRSanitizer.normalizeText(
      buildOcrText(fechaHace2Anos.toISOString().split('T')[0])
    );
    const fechas = OCRSanitizer.extractDates(texto);

    const resultado = PrescriptionEngine.evaluate(texto, fechas);

    expect(resultado.status).toBe<LegalStatus>('CADUCADO');
    expect(resultado.isViable).toBe(true);
    expect(resultado.technicalDictum).toContain('vicios de procedimiento');
    expect(getSemaforoEmoji(resultado.isViable ?? false)).toBe('🟢');
  });

  it('debe detectar IMPUGNABLE_C038 para fotomultas electrónicas menores a 1 año (Sent. C-038)', () => {
    const fechaHace6Meses = new Date();
    fechaHace6Meses.setMonth(fechaHace6Meses.getMonth() - 6);
    const texto = OCRSanitizer.normalizeText(
      buildElectronicOcrText(fechaHace6Meses.toISOString().split('T')[0])
    );
    const fechas = OCRSanitizer.extractDates(texto);

    const resultado = PrescriptionEngine.evaluate(texto, fechas);

    expect(resultado.status).toBe<LegalStatus>('IMPUGNABLE_C038');
    expect(resultado.isViable).toBe(true);
    expect(resultado.technicalDictum).toContain('jurisprudencia constitucional');
    expect(getSemaforoEmoji(resultado.isViable ?? false)).toBe('🟢');
  });

  it('debe detectar VIGENTE para infracciones recientes sin motivo de ganar (🔴)', () => {
    const fechaHace3Meses = new Date();
    fechaHace3Meses.setMonth(fechaHace3Meses.getMonth() - 3);
    const texto = OCRSanitizer.normalizeText(
      buildOcrText(fechaHace3Meses.toISOString().split('T')[0])
    );
    const fechas = OCRSanitizer.extractDates(texto);

    const resultado = PrescriptionEngine.evaluate(texto, fechas);

    expect(resultado.status).toBe<LegalStatus>('VIGENTE');
    expect(resultado.isViable).toBe(false);
    expect(getSemaforoEmoji(resultado.isViable ?? false)).toBe('🔴');
  });

  it('debe devolver REQUIERE_REVISION si el OCR no captó ninguna fecha (datos insuficientes)', () => {
    const resultado = PrescriptionEngine.evaluate('SECRETARIA DE TRANSITO SIN FECHA', []);

    expect(resultado.status).toBe<LegalStatus>('REQUIERE_REVISION');
    expect(resultado.isViable).toBe(false);
    expect(getSemaforoEmoji(resultado.isViable ?? false)).toBe('🔴');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3: Semáforo de Telegram — Construcción de mensaje HTML
// ─────────────────────────────────────────────────────────────────────────────
describe('Semáforo de Telegram: Construcción del dictamen visual HTML', () => {
  const buildDictamenHtml = (
    ocrData: { isViable: boolean; status: string; technicalDictum: string } | undefined
  ): string => {
    if (!ocrData) return '';
    const emoji = ocrData.isViable ? '🟢' : '🔴';
    return `\n⚙️ <b>Dictamen Heurístico:</b> ${emoji} <b>${ocrData.status}</b>\n• <i>${ocrData.technicalDictum}</i>\n`;
  };

  it('debe inyectar semáforo VERDE (🟢) cuando el caso es viable', () => {
    const mockOcrData = {
      isViable: true,
      status: 'PRESCRITO',
      technicalDictum: 'Art. 159 Ley 769/2002: Más de 3 años transcurridos.',
    };

    const html = buildDictamenHtml(mockOcrData);

    expect(html).toContain('🟢');
    expect(html).toContain('PRESCRITO');
    expect(html).toContain('Art. 159');
    expect(html).not.toContain('🔴');
  });

  it('debe inyectar semáforo ROJO (🔴) cuando el caso está VIGENTE', () => {
    const mockOcrData = {
      isViable: false,
      status: 'VIGENTE',
      technicalDictum: 'Dentro de términos legales. Requiere evaluación manual.',
    };

    const html = buildDictamenHtml(mockOcrData);

    expect(html).toContain('🔴');
    expect(html).toContain('VIGENTE');
    expect(html).not.toContain('🟢');
  });

  it('debe devolver cadena vacía si no hay análisis OCR disponible', () => {
    const html = buildDictamenHtml(undefined);
    expect(html).toBe('');
  });
});

