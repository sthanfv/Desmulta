/**
 * Motor de Heurísticas Técnicas (Zero-PII)
 * Implementa Ley 769 de 2002 (Prescripción/Caducidad) y Sentencia C-038/2020.
 */

// ---------------------------------------------------------------------------
// 1. FASE DE SANEAMIENTO (OCR Noise Reduction)
// ---------------------------------------------------------------------------
export const OCRSanitizer = {
  /**
   * Limpia artefactos comunes generados por Tesseract.js
   * y normaliza el texto para la extracción mediante Regex.
   */
  normalizeText: (rawText: string): string => {
    if (!rawText) return '';
    return rawText
      .toUpperCase()
      .replace(/[\r\n]+/g, ' ') // Aplana saltos de línea
      .replace(/\s{2,}/g, ' ') // Elimina espacios dobles
      .replace(/([A-Z]{3})[-\s]*([0-9]{3})/g, '$1$2') // Normaliza placas (ej. ABC-123 a ABC123)
      .replace(/([0-9]{2})\s*[\/\-\.]\s*([0-9]{2})\s*[\/\-\.]\s*([0-9]{4})/g, '$1/$2/$3') // Estandariza fechas a DD/MM/YYYY
      .trim();
  },

  /**
   * Extrae todas las fechas válidas del texto normalizado.
   */
  extractDates: (rawText: string): string[] => {
    const normalized = OCRSanitizer.normalizeText(rawText);
    const dateRegex = /\b(\d{2}\/\d{2}\/\d{4})\b/g;
    const matches = normalized.match(dateRegex);
    return matches ? Array.from(new Set(matches)) : [];
  },
};

import type { OCRAnalysisResult } from '@/lib/definitions';
import { UMBRAL_CONFIANZA_OCR } from '@/lib/config-constants';

/**
 * PrescriptionEngine: Motor de análisis de caducidad y prescripción (v7.6.0).
 * Basado en Ley 769 de 2002 y Sentencia C-038/2020.
 *
 * Cambio v7.6.0: Añadido parámetro `confidenceScore` para modular dictámenes
 * que dependen de ausencia de palabras en el OCR. Con Tesseract.js en imágenes
 * de baja calidad, la ausencia de "RESOLUCION" puede ser falla del OCR, no del
 * expediente. El motor ahora lo reconoce y no emite falsos positivos.
 */
export class PrescriptionEngine {
  /**
   * Evalúa los datos extraídos contra las heurísticas técnicas.
   *
   * @param rawText - Texto crudo del OCR de Tesseract.js.
   * @param dates - Fechas extraídas del texto (formato DD/MM/YYYY).
   * @param confidenceScore - Promedio de confianza del OCR (0-100). Default: 100.
   */
  static evaluate(
    rawText: string,
    dates: string[],
    confidenceScore: number = 100
  ): Partial<OCRAnalysisResult> {
    const normalizedText = OCRSanitizer.normalizeText(rawText);

    // Fallback si el OCR no capturó fechas
    if (dates.length === 0) {
      return {
        status: 'REQUIERE_REVISION',
        isViable: false,
        detectedDates: [],
        technicalDictum: 'Datos insuficientes para evaluación automática.',
      };
    }

    // Ordenar fechas para encontrar la más antigua (presunta fecha de infracción)
    const sortedDates = [...dates].sort((a, b) => {
      const [dayA, monthA, yearA] = a.split('/');
      const [dayB, monthB, yearB] = b.split('/');
      return (
        new Date(`${yearA}-${monthA}-${dayA}`).getTime() -
        new Date(`${yearB}-${monthB}-${dayB}`).getTime()
      );
    });

    const oldestDateStr = sortedDates[0];
    const [day, month, year] = oldestDateStr.split('/');
    const infractionDate = new Date(`${year}-${month}-${day}`);
    const currentDate = new Date();

    // Calcular diferencia en años
    const yearsDiff =
      (currentDate.getTime() - infractionDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

    // 1. Prescripción (Art. 159, Ley 769 de 2002) - 3 años
    // ✅ Este chequeo es MATEMÁTICO (solo usa fechas), no depende de palabras,
    // por lo que NO está sujeto al umbral de confianza OCR.
    if (this.checkPrescription(yearsDiff)) {
      return {
        status: 'PRESCRITO',
        isViable: true,
        detectedDates: sortedDates,
        technicalDictum:
          '¡Excelente noticia! Detectamos inconsistencias temporales en este registro que lo hacen altamente viable para exclusión inmediata. Un experto blindará tu defensa.',
      };
    }

    // ⚠️ GUARDIÁN DE CONFIANZA OCR (v7.6.0)
    // Para dictámenes que dependen de la AUSENCIA de palabras (caducidad, C-038),
    // un OCR de baja calidad puede no reconocer términos aunque existan en el documento.
    // Si la confianza es baja, degradamos a REQUIERE_REVISION para evitar falsos positivos.
    if (confidenceScore < UMBRAL_CONFIANZA_OCR) {
      return {
        status: 'REQUIERE_REVISION',
        isViable: false,
        detectedDates: sortedDates,
        lowConfidence: true,
        technicalDictum: `Calidad de imagen insuficiente para dictamen automático (confianza OCR: ${Math.round(confidenceScore)}%). Un experto revisará el expediente manualmente para identificar vicios de procedimiento.`,
      };
    }

    // 2. Caducidad (Art. 161, Ley 769 de 2002) - 1 año sin resolución
    if (this.checkCaducity(yearsDiff, normalizedText)) {
      return {
        status: 'CADUCADO',
        isViable: true,
        detectedDates: sortedDates,
        technicalDictum:
          'Nuestro motor ha identificado vicios de procedimiento por falta de resolución oportuna. Tu caso califica para saneamiento integral ante las autoridades.',
      };
    }

    // 3. Solidaridad (Sentencia C-038 de 2020)
    if (this.checkElectronicSolidarity(yearsDiff, normalizedText, oldestDateStr)) {
      return {
        status: 'IMPUGNABLE_C038',
        isViable: true,
        detectedDates: sortedDates,
        technicalDictum:
          'Detección electrónica validada. Según la jurisprudencia constitucional, este registro es impugnable por falta de plena identificación. Procedemos al blindaje.',
      };
    }

    // Fallback: Caso Vigente
    return {
      status: 'VIGENTE',
      isViable: false,
      detectedDates: sortedDates,
      technicalDictum:
        'Caso en periodo de vigencia estándar. Requiere una auditoría técnica profunda de las notificaciones para encontrar vicios ocultos en el proceso.',
    };
  }

  private static checkPrescription(yearsDiff: number): boolean {
    return yearsDiff > 3;
  }

  private static checkCaducity(yearsDiff: number, normalizedText: string): boolean {
    return (
      yearsDiff > 1 &&
      yearsDiff <= 3 &&
      !normalizedText.includes('RESOLUCION') &&
      !normalizedText.includes('MANDAMIENTO')
    );
  }

  private static checkElectronicSolidarity(
    yearsDiff: number,
    normalizedText: string,
    oldestDateStr: string
  ): boolean {
    const [, , y] = oldestDateStr.split('/');
    if (parseInt(y) < 2020) return false;
    const isElectronic = /(FOTOMULTA|ELECTRONICO|CAMARA|SAST|FOTODETECCION)/i.test(normalizedText);
    return isElectronic && yearsDiff <= 1;
  }
}
