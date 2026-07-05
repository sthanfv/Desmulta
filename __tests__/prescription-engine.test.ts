import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { OCRSanitizer, PrescriptionEngine } from '@/lib/legal/prescription-engine';

describe('QA Motor Heurístico Legal (Ley 769 & C-038)', () => {
  beforeAll(() => {
    // Congelar el tiempo en una fecha específica para determinismo (23 de Marzo de 2026)
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-23'));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  describe('OCRSanitizer', () => {
    it('debe normalizar texto sucio y extraer fechas correctamente', () => {
      const rawText = 'COMPARENDO \n \n ABC - 123 \n FECHA: 15 / 05 / 2021  ';
      const normalized = OCRSanitizer.normalizeText(rawText);
      const dates = OCRSanitizer.extractDates(normalized);

      expect(normalized).toContain('ABC123');
      expect(normalized).toContain('15/05/2021');
      expect(dates).toEqual(['15/05/2021']);
    });
  });

  describe('PrescriptionEngine (Máquina de Estados)', () => {
    it('Caso 1: Prescripción (Más de 3 años)', () => {
      // Fecha de infracción: 1 Enero 2020 (Más de 6 años)
      const result = PrescriptionEngine.evaluate('COMPARENDO ABC123', ['01/01/2020']);
      expect(result.status).toBe('PRESCRITO');
      expect(result.isViable).toBe(true);
    });

    it('Caso 2: Caducidad (Entre 1 y 3 años sin resolución)', () => {
      // Fecha de infracción: 1 Enero 2024 (2 años aprox)
      const result = PrescriptionEngine.evaluate('COMPARENDO ABC123 SIN NOTIFICAR', ['01/01/2024']);
      expect(result.status).toBe('CADUCADO');
      expect(result.isViable).toBe(true);
    });

    it('Caso 3: Solidaridad C-038 (Fotomulta reciente)', () => {
      // Fecha de infracción: 1 Enero 2026 (Menos de 1 año)
      const result = PrescriptionEngine.evaluate('DETECCION ELECTRONICA CAMARA SAST ABC123', [
        '01/01/2026',
      ]);
      expect(result.status).toBe('IMPUGNABLE_C038');
      expect(result.isViable).toBe(true);
    });

    it('Caso 4: Vigente (Reciente, no electrónica, sin prescripción)', () => {
      // Fecha de infracción: 1 Enero 2026 (Menos de 1 año)
      const result = PrescriptionEngine.evaluate('COMPARENDO FISICO ABC123 AGENTE DE TRANSITO', [
        '01/01/2026',
      ]);
      expect(result.status).toBe('VIGENTE');
      expect(result.isViable).toBe(false);
    });

    it('Caso 5: Falla de OCR (Requiere revisión)', () => {
      const result = PrescriptionEngine.evaluate('TEXTO ILEGIBLE SIN FECHAS', []);
      expect(result.status).toBe('REQUIERE_REVISION');
      expect(result.isViable).toBe(false);
    });

    it('Caso 6: Caducidad con OCR de baja confianza → NO debe emitir CADUCADO (falso positivo legal)', () => {
      // Fecha que cumple caducidad (2 años aprox), texto sin RESOLUCION/MANDAMIENTO
      // PERO con confianza OCR baja (45%). El motor NO puede afirmar que no hay resolución.
      const result = PrescriptionEngine.evaluate(
        'COMPARENDO ABC123 SIN NOTIFICAR',
        ['01/01/2024'],
        40 // confidenceScore bajo (menor al nuevo umbral de 45)
      );
      // Debe degradar a REQUIERE_REVISION, NO a CADUCADO
      expect(result.status).toBe('REQUIERE_REVISION');
      expect(result.isViable).toBe(false);
      expect(result.lowConfidence).toBe(true);
    });

    it('Caso 7: Prescripción matemática con OCR de baja confianza → NO debe verse afectada', () => {
      // La prescripción (> 3 años) es un cálculo de fechas, no depende de palabras del OCR.
      // Con confianza baja, el dictamen PRESCRITO debe mantenerse igual.
      const result = PrescriptionEngine.evaluate(
        'TEXTO ILEGIBLE DE BAJA CALIDAD',
        ['01/01/2020'], // Más de 6 años
        30 // confidenceScore muy bajo
      );
      // Prescripción matemática: NO debe degradarse
      expect(result.status).toBe('PRESCRITO');
      expect(result.isViable).toBe(true);
    });

    it('Caso 8: C-038 con OCR de baja confianza → debe degradar a REQUIERE_REVISION', () => {
      // Fotomulta reciente, pero el OCR no reconoció bien los patrones electrónicos.
      // Con confianza baja, no podemos afirmar que es FOTOMULTA si las palabras son dudosas.
      const result = PrescriptionEngine.evaluate(
        'DETECCION ELECTRONICA CAMARA SAST ABC123',
        ['01/01/2026'],
        40 // confidenceScore bajo (menor al nuevo umbral de 45)
      );
      // C-038 depende de palabras (FOTOMULTA/CAMARA/SAST): debe degradar
      expect(result.status).toBe('REQUIERE_REVISION');
      expect(result.isViable).toBe(false);
      expect(result.lowConfidence).toBe(true);
    });

    it('Caso 9: Desambiguación de fechas por contexto (evita falsos positivos con fechas de resolución)', () => {
      // Se tienen dos fechas: '15/05/2024' e '10/10/2018'.
      // Pero '10/10/2018' está precedida por la palabra 'RESOLUCION'.
      // El motor debe descartar '10/10/2018' por contexto de resolución y tomar '15/05/2024' como la fecha de infracción principal.
      const result = PrescriptionEngine.evaluate(
        'INFRACCION EL 15/05/2024 SIMIT RESOLUCION Nro 45 del 10/10/2018',
        ['15/05/2024', '10/10/2018']
      );
      // '10/10/2018' debe descartarse, resultando solo en ['15/05/2024']
      expect(result.detectedDates).not.toContain('10/10/2018');
      expect(result.detectedDates).toContain('15/05/2024');
    });
  });
});


