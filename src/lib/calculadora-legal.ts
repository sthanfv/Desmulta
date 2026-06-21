// src/lib/calculadora-legal.ts
import {
  TASA_EA_VIGENTE,
  SMMLV_2026,
  SMDLV_2026,
  VIGENCIA_CONSTANTES_ANIO,
} from './config-constants';
import { PrescriptionEngine, OCRSanitizer } from '@/lib/legal/prescription-engine';

// ─── Tipos Públicos ─────────────────────────────────────────────────────────────

export interface ResultadoPrescripcion {
  tiempoTranscurrido: {
    anos: number;
    meses: number;
    dias: number;
  };
  diasTotales: number;
  /** Estado simplificado para la UI de la calculadora (slider) */
  estado: 'VIGENTE' | 'ALERTA' | 'CADUCIDAD ESTIMADA';
  /** Estado enriquecido del PrescriptionEngine (para la API B2B) */
  estadoLegal: 'PRESCRITO' | 'CADUCADO' | 'IMPUGNABLE_C038' | 'VIGENTE' | 'REQUIERE_REVISION';
  porcentajeCaducidad: number;
  probabilidadExito: string;
  disclaimerLegal: string;
  isViable: boolean;
}

export interface ResultadoCalculadoraCompleta {
  /** Resultado de prescripción/viabilidad legal */
  prescripcion: ResultadoPrescripcion;
  /** Cálculo financiero de la deuda */
  financiero: {
    valorOriginal: number;
    interesesAcumulados: number;
    valorTotalActual: number;
    tasaEAVigente: number;
    /** Valor de la multa en Salarios Mínimos Mensuales Legales Vigentes (SMMLV) */
    valorEnSMMLV: number;
    /** Valor de la multa en Salarios Mínimos Diarios Legales Vigentes (SMDLV) */
    valorEnSMDLV: number;
    smmlvVigente: number;
    smdlvVigente: number;
    vigenciaAnio: number;
    fechaCalculo: string;
  };
}

// ─── Motor Matemático de Prescripción (Alta Precisión) ───────────────────────

/**
 * Calcula el tiempo exacto transcurrido mitigando errores de Timezone.
 * Integra el PrescriptionEngine para estados legales enriquecidos.
 *
 * @param fechaInfraccionISO - Fecha de infracción en formato YYYY-MM-DD
 * @param tieneCobroCoactivo - Si el caso está en cobro coactivo (amplía prescripción a 6 años)
 */
export function calcularViabilidadLegal(
  fechaInfraccionISO: string,
  tieneCobroCoactivo: boolean
): ResultadoPrescripcion {
  // 1. Sanitización estricta (Forzamos UTC para evitar saltos de día por zona horaria de Colombia UTC-5)
  const fechaInfraccion = new Date(`${fechaInfraccionISO}T00:00:00Z`);
  const hoy = new Date();

  // Congelamos 'hoy' a las 00:00:00 UTC para comparar manzanas con manzanas
  const hoyUTC = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()));

  if (isNaN(fechaInfraccion.getTime())) {
    throw new Error('Falla Crítica: Formato de fecha inválido inyectado al motor.');
  }

  // Muro de contención: Solo aceptamos fechas entre el año 2000 (Código Nacional de Tránsito)
  // y la fecha actual. Esto bloquea trolleos con años tipo 1500 o 2099.
  const anioInfraccion = fechaInfraccion.getUTCFullYear();
  if (anioInfraccion < 2000 || anioInfraccion > hoyUTC.getUTCFullYear()) {
    throw new Error(
      'Fecha fuera de rango legal: solo se aceptan infracciones entre el año 2000 y hoy.'
    );
  }

  // 2. Cálculo de la fecha límite teórica (El umbral de la ley)
  // Ley 1843 y CNT: 3 años normales. Si hay coactivo, son 3 años adicionales desde la resolución.
  // Para el motor, si hay coactivo, el "horizonte" de prescripción se aleja a 6 años totales como peor escenario.
  const anosParaPrescribir = tieneCobroCoactivo ? 6 : 3;
  const fechaLimite = new Date(fechaInfraccion.getTime());
  fechaLimite.setUTCFullYear(fechaLimite.getUTCFullYear() + anosParaPrescribir);

  // 3. Diferencia cronológica exacta (Manejo de bisiestos intrínseco en JS Date)
  let anos = hoyUTC.getUTCFullYear() - fechaInfraccion.getUTCFullYear();
  let meses = hoyUTC.getUTCMonth() - fechaInfraccion.getUTCMonth();
  let dias = hoyUTC.getUTCDate() - fechaInfraccion.getUTCDate();

  if (dias < 0) {
    meses--;
    // Tomamos los días del mes anterior
    const ultimoDiaMesAnterior = new Date(
      Date.UTC(hoyUTC.getUTCFullYear(), hoyUTC.getUTCMonth(), 0)
    ).getUTCDate();
    dias += ultimoDiaMesAnterior;
  }
  if (meses < 0) {
    anos--;
    meses += 12;
  }

  // 4. Cálculos de progreso y días absolutos
  const msPorDia = 1000 * 60 * 60 * 24;
  const diasTotales = Math.floor((hoyUTC.getTime() - fechaInfraccion.getTime()) / msPorDia);
  const diasMeta = Math.floor((fechaLimite.getTime() - fechaInfraccion.getTime()) / msPorDia);

  let porcentaje = (diasTotales / diasMeta) * 100;

  // 5. Motor de Decisión simplificado para la UI (Triage visual)
  let estado: 'VIGENTE' | 'ALERTA' | 'CADUCIDAD ESTIMADA';
  let probabilidadExito: string;

  if (porcentaje >= 98) {
    estado = 'CADUCIDAD ESTIMADA';
    probabilidadExito = '98% - Sujeto a revisión de actos administrativos y mandamientos de pago';
  } else if (porcentaje >= 90) {
    estado = 'ALERTA';
    probabilidadExito = '70% - Riesgo inminente de embargo procesal activo';
  } else {
    estado = 'VIGENTE';
    probabilidadExito = '30% - Viable condicionado a vicios de notificación (Ley 1843)';
  }

  // Blindaje legal: Nunca prometer el 100% de caducidad hasta el dictamen oficial.
  if (porcentaje >= 98) porcentaje = 98;
  if (porcentaje < 0) porcentaje = 0;

  // 6. Integración con PrescriptionEngine para estado legal enriquecido
  // Convertimos la fecha ISO a DD/MM/YYYY para que el engine la entienda
  const [anioStr, mesStr, diaStr] = fechaInfraccionISO.split('-');
  const fechaDDMMYYYY = `${diaStr}/${mesStr}/${anioStr}`;
  const dictamen = PrescriptionEngine.evaluate('', [fechaDDMMYYYY]);
  const estadoLegal = dictamen.status ?? 'REQUIERE_REVISION';

  // 7. La Capa de Protección Legal (El Disclaimer)
  const disclaimer = `⚠️ Cálculo aproximado. Llevas exactamente ${anos} años, ${meses} meses y ${dias} días desde la infracción. Este sistema asume una probabilidad de éxito del ${
    probabilidadExito.split('%')[0]
  }% basándose en el tiempo calendario bruto. La exactitud técnica de la prescripción puede variar entre 3 y 15 días hábiles debido a los tiempos de notificación en oficinas de correo certificado y edictos de la Secretaría de Tránsito.`;

  return {
    tiempoTranscurrido: { anos, meses, dias },
    diasTotales,
    estado,
    estadoLegal: estadoLegal as ResultadoPrescripcion['estadoLegal'],
    porcentajeCaducidad: Number(porcentaje.toFixed(2)),
    probabilidadExito,
    disclaimerLegal: disclaimer,
    isViable: dictamen.isViable ?? false,
  };
}

/**
 * Calcula los intereses moratorios usando interés compuesto diario.
 * Basado en la Tasa Efectiva Anual (EA) vigente.
 *
 * @param montoBase - Capital adeudado original en pesos colombianos.
 * @param fechaInfraccionISO - Fecha de la infracción en formato YYYY-MM-DD.
 * @returns El valor total de los intereses generados.
 */
export function calcularIntereses(montoBase: number, fechaInfraccionISO: string): number {
  // Validación temprana: monto nulo o negativo retorna 0 de forma segura
  if (!montoBase || montoBase <= 0) return 0;

  const fechaInfraccion = new Date(`${fechaInfraccionISO}T00:00:00Z`);
  const hoy = new Date();
  const hoyUTC = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()));

  if (isNaN(fechaInfraccion.getTime())) {
    return 0; // Fallback seguro
  }

  const msPorDia = 1000 * 60 * 60 * 24;
  const diasTotales = Math.floor((hoyUTC.getTime() - fechaInfraccion.getTime()) / msPorDia);

  if (diasTotales <= 0) return 0;

  const tasaDiaria = Math.pow(1 + TASA_EA_VIGENTE, 1 / 365) - 1;

  // Fórmula de interés COMPUESTO diario (más precisa que el interés simple):
  // Intereses = Monto * ((1 + tasaDiaria)^días - 1)
  const intereses = montoBase * (Math.pow(1 + tasaDiaria, diasTotales) - 1);

  return intereses;
}

/**
 * Función unificada para la API B2B: calcula prescripción + intereses + SMLMV.
 * Acepta fecha exacta (formato ISO) y monto base de la multa.
 *
 * @param valorMulta - Monto original de la multa en pesos colombianos
 * @param fechaInfraccionISO - Fecha de la infracción en formato YYYY-MM-DD
 * @param tieneCobroCoactivo - Si el caso está en cobro coactivo
 * @param textoOCR - Texto crudo del OCR para análisis avanzado (opcional)
 */
export function calcularMultaCompleta(
  valorMulta: number,
  fechaInfraccionISO: string,
  tieneCobroCoactivo: boolean = false,
  textoOCR: string = ''
): ResultadoCalculadoraCompleta {
  // 1. Calcular viabilidad legal
  const prescripcion = calcularViabilidadLegal(fechaInfraccionISO, tieneCobroCoactivo);

  // 2. Si hay texto OCR, enriquecer con PrescriptionEngine completo
  if (textoOCR) {
    const fechasDetectadas = OCRSanitizer.extractDates(textoOCR);
    if (fechasDetectadas.length > 0) {
      const dictamenEnriquecido = PrescriptionEngine.evaluate(textoOCR, fechasDetectadas);
      if (dictamenEnriquecido.status) {
        prescripcion.estadoLegal =
          dictamenEnriquecido.status as ResultadoPrescripcion['estadoLegal'];
        prescripcion.isViable = dictamenEnriquecido.isViable ?? false;
      }
    }
  }

  // 3. Calcular deuda financiera
  const interesesAcumulados = Math.round(calcularIntereses(valorMulta, fechaInfraccionISO));
  const valorTotalActual = valorMulta + interesesAcumulados;
  const valorEnSMMLV = Number((valorMulta / SMMLV_2026).toFixed(2));
  const valorEnSMDLV = Number((valorMulta / SMDLV_2026).toFixed(1));

  return {
    prescripcion,
    financiero: {
      valorOriginal: valorMulta,
      interesesAcumulados,
      valorTotalActual,
      tasaEAVigente: TASA_EA_VIGENTE,
      valorEnSMMLV,
      valorEnSMDLV,
      smmlvVigente: SMMLV_2026,
      smdlvVigente: SMDLV_2026,
      vigenciaAnio: VIGENCIA_CONSTANTES_ANIO,
      fechaCalculo: new Date().toISOString().split('T')[0],
    },
  };
}
