import { z } from 'zod';
import { CAUSALES_TRANSITO, CausalTransitoId } from '@/lib/legal/legal-types';
import { SMDLV_2026, SMMLV_2026, TASA_EA_VIGENTE, VIGENCIA_CONSTANTES_ANIO } from '@/lib/config-constants';
import { PrescriptionEngine, OCRSanitizer } from '@/lib/legal/prescription-engine';

/**
 * Esquema Zod para el objeto comparendo extraído por Gemini.
 * Valida y tipifica la respuesta JSON estructurada del modelo.
 */
export const ComparendoSchema = z.object({
  numeroComparendo: z.string().nullable().optional(),
  fechaInfraccion: z.string().nullable().optional(), // DD/MM/YYYY
  placa: z.string().nullable().optional(),
  codigoInfraccion: z.string().nullable().optional(),
  descripcionInfraccion: z.string().nullable().optional(),
  valorMulta: z.number().nullable().optional(),
  nombreInfractor: z.string().nullable().optional(),
  cedulaInfractor: z.string().nullable().optional(),
  entidadEmisora: z.string().nullable().optional(),
  ciudad: z.string().nullable().optional(),
  esFotomulta: z.boolean().default(false),
  tieneCobroCoactivo: z.boolean().default(false),
  tieneMandamientoPago: z.boolean().default(false),
  tieneResolucionSancionatoria: z.boolean().default(false),
  fechaResolucion: z.string().nullable().optional(), // DD/MM/YYYY
  textoCompleto: z.string().default(''),
});

export type Comparendo = z.infer<typeof ComparendoSchema>;

/**
 * Resultado del análisis legal completo de un comparendo.
 * Este es el objeto que devuelven los endpoints B2B.
 */
export interface AnalisisComparendo {
  /** Datos del OCR y el proveedor utilizado */
  ocr: {
    proveedor: 'google-gemini-2.5-flash' | 'tesseract-js-fallback' | 'texto-crudo';
    modoEstructurado: boolean;
    confianza: number; // 0-100
  };
  /** Datos estructurados del comparendo extraídos por Gemini */
  comparendo: Comparendo | null;
  /** Dictamen legal calculado por PrescriptionEngine */
  analisisLegal: {
    estado: 'PRESCRITO' | 'CADUCADO' | 'IMPUGNABLE_C038' | 'VIGENTE' | 'REQUIERE_REVISION';
    isViable: boolean;
    fechasDetectadas: string[];
    diasTranscurridos: number | null;
    añosTranscurridos: number | null;
    dictamenTecnico: string;
    causalesAplicables: CausalResumen[];
    lowConfidence?: boolean;
  };
  /** Cálculo financiero de la deuda */
  calculadora: {
    valorOriginal: number | null;
    interesesAcumulados: number | null;
    valorTotalActual: number | null;
    tasaEAVigente: number;
    smmlvVigente: number;
    smdlvVigente: number;
    valorEnSMLMV: number | null;
    vigenciaConstantesAnio: number;
    fechaCalculo: string;
  };
}

/** Resumen de causal legal aplicable al caso */
export interface CausalResumen {
  id: CausalTransitoId;
  titulo: string;
  normativa: string;
}

/**
 * Convierte la respuesta cruda de Gemini (JSON o texto) a un objeto `Comparendo` tipado.
 * Si la respuesta no es JSON válido, devuelve null para que el flujo use el motor legacy.
 *
 * @param rawGeminiResponse - Respuesta cruda del modelo (JSON string o texto crudo)
 */
export function extraerComparendo(rawGeminiResponse: unknown): Comparendo | null {
  if (!rawGeminiResponse || typeof rawGeminiResponse !== 'object') return null;

  const parsed = ComparendoSchema.safeParse(rawGeminiResponse);
  if (!parsed.success) {
    return null;
  }
  return parsed.data;
}

/**
 * Determina las causales legales aplicables a partir del dictamen del motor de prescripción.
 *
 * @param estado - Estado legal retornado por PrescriptionEngine
 * @param comparendo - Datos del comparendo extraído (puede ser null)
 */
export function determinarCausales(
  estado: string,
  comparendo: Comparendo | null
): CausalResumen[] {
  const causales: CausalResumen[] = [];

  if (estado === 'PRESCRITO') {
    const esCoactivo = comparendo?.tieneCobroCoactivo ?? false;
    if (esCoactivo) {
      causales.push({
        id: 'causal_6_doble_prescripcion_6',
        titulo: CAUSALES_TRANSITO.causal_6_doble_prescripcion_6.titulo,
        normativa: CAUSALES_TRANSITO.causal_6_doble_prescripcion_6.normativa,
      });
    } else {
      causales.push({
        id: 'causal_1_prescripcion_3_anios',
        titulo: CAUSALES_TRANSITO.causal_1_prescripcion_3_anios.titulo,
        normativa: CAUSALES_TRANSITO.causal_1_prescripcion_3_anios.normativa,
      });
    }
  }

  if (estado === 'CADUCADO') {
    causales.push({
      id: 'causal_2_caducidad_1_anio',
      titulo: CAUSALES_TRANSITO.causal_2_caducidad_1_anio.titulo,
      normativa: CAUSALES_TRANSITO.causal_2_caducidad_1_anio.normativa,
    });
    causales.push({
      id: 'causal_7_falta_mandamiento',
      titulo: CAUSALES_TRANSITO.causal_7_falta_mandamiento.titulo,
      normativa: CAUSALES_TRANSITO.causal_7_falta_mandamiento.normativa,
    });
  }

  if (estado === 'IMPUGNABLE_C038') {
    causales.push({
      id: 'causal_3_fotomulta_identificacion',
      titulo: CAUSALES_TRANSITO.causal_3_fotomulta_identificacion.titulo,
      normativa: CAUSALES_TRANSITO.causal_3_fotomulta_identificacion.normativa,
    });
    causales.push({
      id: 'causal_4_indebida_notificacion',
      titulo: CAUSALES_TRANSITO.causal_4_indebida_notificacion.titulo,
      normativa: CAUSALES_TRANSITO.causal_4_indebida_notificacion.normativa,
    });
  }

  // Si el comparendo tiene fotomulta y no fue detectada por el engine, agregar causal de señalización
  if (
    comparendo?.esFotomulta &&
    !causales.find((c) => c.id === 'causal_5_falta_senalizacion')
  ) {
    causales.push({
      id: 'causal_5_falta_senalizacion',
      titulo: CAUSALES_TRANSITO.causal_5_falta_senalizacion.titulo,
      normativa: CAUSALES_TRANSITO.causal_5_falta_senalizacion.normativa,
    });
  }

  return causales;
}

/**
 * Calcula los intereses moratorios usando interés compuesto diario.
 *
 * @param montoBase - Capital adeudado original en pesos
 * @param fechaInfraccionISO - Fecha de infracción en formato YYYY-MM-DD
 */
function calcularInteresesInterno(montoBase: number, fechaInfraccionISO: string): number {
  if (!montoBase || montoBase <= 0) return 0;

  const fechaInfraccion = new Date(`${fechaInfraccionISO}T00:00:00Z`);
  const hoy = new Date();
  const hoyUTC = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()));

  if (isNaN(fechaInfraccion.getTime())) return 0;

  const msPorDia = 1000 * 60 * 60 * 24;
  const diasTotales = Math.floor((hoyUTC.getTime() - fechaInfraccion.getTime()) / msPorDia);
  if (diasTotales <= 0) return 0;

  const tasaDiaria = Math.pow(1 + TASA_EA_VIGENTE, 1 / 365) - 1;
  return montoBase * (Math.pow(1 + tasaDiaria, diasTotales) - 1);
}

/**
 * Convierte la fecha DD/MM/YYYY a YYYY-MM-DD (formato ISO para cálculos).
 */
function convertirFechaAISO(fechaDDMMYYYY: string): string | null {
  const partes = fechaDDMMYYYY.split('/');
  if (partes.length !== 3) return null;
  const [dia, mes, anio] = partes;
  return `${anio}-${mes}-${dia}`;
}

/**
 * Función principal: dado un texto OCR y un objeto comparendo (opcional),
 * produce el AnalisisComparendo completo que usan los endpoints B2B.
 *
 * @param textoOCR - Texto crudo del OCR (para PrescriptionEngine)
 * @param comparendo - Objeto tipado extraído por Gemini (puede ser null)
 * @param proveedor - Motor OCR que generó el texto
 * @param confianza - Score de confianza del OCR (0-100)
 */
export function construirAnalisisCompleto(
  textoOCR: string,
  comparendo: Comparendo | null,
  proveedor: 'google-gemini-2.5-flash' | 'tesseract-js-fallback' | 'texto-crudo',
  confianza: number = 100
): AnalisisComparendo {
  // 1. Extraer fechas del texto para el motor de prescripción
  const fechasDetectadas = OCRSanitizer.extractDates(textoOCR);

  // 2. Ejecutar el motor de prescripción enriquecido
  const dictamen = PrescriptionEngine.evaluate(textoOCR, fechasDetectadas, confianza);
  const estado = dictamen.status ?? 'REQUIERE_REVISION';

  // 3. Determinar causales aplicables
  const causalesAplicables = determinarCausales(estado, comparendo);

  // 4. Calcular la antigüedad en días y años
  const fechaPrincipal = comparendo?.fechaInfraccion ?? (fechasDetectadas[0] ?? null);
  let diasTranscurridos: number | null = null;
  let añosTranscurridos: number | null = null;
  let fechaISO: string | null = null;

  if (fechaPrincipal) {
    fechaISO = convertirFechaAISO(fechaPrincipal);
    if (fechaISO) {
      const fechaDate = new Date(`${fechaISO}T00:00:00Z`);
      const hoyUTC = new Date();
      const msPorDia = 1000 * 60 * 60 * 24;
      diasTranscurridos = Math.floor((hoyUTC.getTime() - fechaDate.getTime()) / msPorDia);
      añosTranscurridos = Number((diasTranscurridos / 365).toFixed(2));
    }
  }

  // 5. Calcular la deuda financiera
  const valorOriginal = comparendo?.valorMulta ?? null;
  let interesesAcumulados: number | null = null;
  let valorTotalActual: number | null = null;
  let valorEnSMLMV: number | null = null;

  if (valorOriginal && valorOriginal > 0 && fechaISO) {
    interesesAcumulados = Math.round(calcularInteresesInterno(valorOriginal, fechaISO));
    valorTotalActual = valorOriginal + interesesAcumulados;
    valorEnSMLMV = Number((valorOriginal / SMMLV_2026).toFixed(2));
  }

  return {
    ocr: {
      proveedor,
      modoEstructurado: comparendo !== null,
      confianza,
    },
    comparendo,
    analisisLegal: {
      estado: estado as AnalisisComparendo['analisisLegal']['estado'],
      isViable: dictamen.isViable ?? false,
      fechasDetectadas: dictamen.detectedDates ?? fechasDetectadas,
      diasTranscurridos,
      añosTranscurridos,
      dictamenTecnico: dictamen.technicalDictum ?? 'Sin dictamen disponible.',
      causalesAplicables,
      lowConfidence: dictamen.lowConfidence,
    },
    calculadora: {
      valorOriginal,
      interesesAcumulados,
      valorTotalActual,
      tasaEAVigente: TASA_EA_VIGENTE,
      smmlvVigente: SMMLV_2026,
      smdlvVigente: SMDLV_2026,
      valorEnSMLMV,
      vigenciaConstantesAnio: VIGENCIA_CONSTANTES_ANIO,
      fechaCalculo: new Date().toISOString().split('T')[0],
    },
  };
}
