// src/lib/calculadora-legal.ts
import {
  TASA_EA_VIGENTE,
  SMDLV_2026,
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

// ─── Motor Matemático Financiero (Cálculo Histórico y Compuesto) ───────────────

import { FINANCIAL_HISTORY, getSMDLVHistorico } from './financial-history';

/**
 * Calcula los intereses moratorios usando interés compuesto ANUALIZADO real.
 * Si la multa es de 2015, calcula el interés de 2015 con la tasa de 2015,
 * el interés de 2016 con la tasa de 2016, etc.
 *
 * @param montoBaseReal - Capital adeudado original en pesos del AÑO DE LA INFRACCIÓN.
 * @param fechaInfraccionISO - Fecha de la infracción en formato YYYY-MM-DD.
 * @returns El valor total de los intereses generados.
 */
export function calcularInteresesHistoricos(
  montoBaseReal: number, 
  fechaInfraccionISO: string,
  tieneCobroCoactivo: boolean = false
): number {
  if (!montoBaseReal || montoBaseReal <= 0) return 0;

  const fechaInfraccion = new Date(`${fechaInfraccionISO}T00:00:00Z`);
  const hoy = new Date();
  const hoyUTC = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()));

  if (isNaN(fechaInfraccion.getTime())) return 0;

  const anioInfraccion = fechaInfraccion.getUTCFullYear();
  const anioActual = hoyUTC.getUTCFullYear();

  let interesesAcumulados = 0;
  const msPorDia = 1000 * 60 * 60 * 24;
  
  // Limite legal de años sumando intereses (Estatuto Tributario / CNT)
  const limiteAnios = tieneCobroCoactivo ? 6 : 3;
  const maxDiasPermitidos = limiteAnios * 365;
  let diasComputadosTotales = 0;

  for (let anio = anioInfraccion; anio <= anioActual; anio++) {
    // Si ya alcanzamos el tope legal de prescripción, congelar intereses
    if (diasComputadosTotales >= maxDiasPermitidos) break;

    // Artículo 635 del Estatuto Tributario: Tasa de Usura menos 2 puntos porcentuales
    let tasaEA = (FINANCIAL_HISTORY[anio]?.usuraEA || TASA_EA_VIGENTE) - 0.02;
    tasaEA = Math.max(0, tasaEA);
    
    // Tasa diaria nominal para Interés Simple
    const tasaDiaria = tasaEA / 365; 

    let diasEnEsteAnio = 365;

    if (anio === anioInfraccion) {
      const finDeAnio = new Date(Date.UTC(anio, 11, 31)); // 31 Dic
      diasEnEsteAnio = Math.max(0, Math.floor((finDeAnio.getTime() - fechaInfraccion.getTime()) / msPorDia));
      
      // Aplicar gracia procesal (Gap de Resolución)
      diasEnEsteAnio = Math.max(0, diasEnEsteAnio - 60);
    }
    else if (anio === anioActual) {
      const inicioDeAnio = new Date(Date.UTC(anio, 0, 1)); // 1 Ene
      diasEnEsteAnio = Math.max(0, Math.floor((hoyUTC.getTime() - inicioDeAnio.getTime()) / msPorDia));
    }

    // Topar días según el máximo permitido
    if (diasComputadosTotales + diasEnEsteAnio > maxDiasPermitidos) {
      diasEnEsteAnio = maxDiasPermitidos - diasComputadosTotales;
    }

    if (diasEnEsteAnio > 0) {
      // Aplicar INTERÉS SIMPLE
      const interesAnual = montoBaseReal * tasaDiaria * diasEnEsteAnio;
      interesesAcumulados += interesAnual;
      diasComputadosTotales += diasEnEsteAnio;
    }
  }

  return Math.round(interesesAcumulados);
}

/**
 * Función unificada para la API B2B: calcula prescripción + intereses + SMLMV.
 * Acepta fecha exacta (formato ISO) y monto base de la multa.
 *
 * @param valorMulta2026 - Monto nominal de la multa en pesos ACTUALES (Ej: C29 = 650,000 en 2026)
 * @param fechaInfraccionISO - Fecha de la infracción en formato YYYY-MM-DD
 * @param tieneCobroCoactivo - Si el caso está en cobro coactivo
 * @param textoOCR - Texto crudo del OCR para análisis avanzado (opcional)
 */
export function calcularMultaCompleta(
  valorMulta2026: number,
  fechaInfraccionISO: string,
  tieneCobroCoactivo: boolean = false,
  textoOCR: string = ''
): ResultadoCalculadoraCompleta {
  // 1. Calcular viabilidad legal
  const prescripcion = calcularViabilidadLegal(fechaInfraccionISO, tieneCobroCoactivo);

  // 2. Enriquecer con PrescriptionEngine si hay OCR
  if (textoOCR) {
    const fechasDetectadas = OCRSanitizer.extractDates(textoOCR);
    if (fechasDetectadas.length > 0) {
      const dictamenEnriquecido = PrescriptionEngine.evaluate(textoOCR, fechasDetectadas);
      if (dictamenEnriquecido.status) {
        prescripcion.estadoLegal = dictamenEnriquecido.status as ResultadoPrescripcion['estadoLegal'];
        prescripcion.isViable = dictamenEnriquecido.isViable ?? false;
      }
    }
  }

  // 3. Re-ingeniería Financiera (Regresión Histórica)
  // Determinar el año de la infracción
  const fechaObj = new Date(`${fechaInfraccionISO}T00:00:00Z`);
  const anioInfraccion = isNaN(fechaObj.getTime()) ? 2026 : fechaObj.getUTCFullYear();
  
  // Calcular los SMDLV basándose en el valor enviado frente al SMDLV 2026
  const cantidadSMDLV = valorMulta2026 / SMDLV_2026; 
  
  // Calcular el Valor Original REAL en pesos del año en que ocurrió
  const smdlvHistorico = getSMDLVHistorico(anioInfraccion);
  const valorOriginalHistorico = Math.round(cantidadSMDLV * smdlvHistorico);

  // Calcular Intereses sobre el valor histórico usando el motor de tramos anuales
  const interesesAcumulados = Math.round(calcularInteresesHistoricos(valorOriginalHistorico, fechaInfraccionISO));
  
  const valorTotalActual = valorOriginalHistorico + interesesAcumulados;
  
  const valorEnSMMLV = Number((valorOriginalHistorico / (smdlvHistorico * 30)).toFixed(2));
  const valorEnSMDLV = Number(cantidadSMDLV.toFixed(1));

  return {
    prescripcion,
    financiero: {
      valorOriginal: valorOriginalHistorico,
      interesesAcumulados,
      valorTotalActual,
      tasaEAVigente: TASA_EA_VIGENTE, // Tasa actual de referencia
      valorEnSMMLV,
      valorEnSMDLV,
      smmlvVigente: smdlvHistorico * 30, // SMMLV del año de la infracción
      smdlvVigente: smdlvHistorico,
      vigenciaAnio: anioInfraccion,
      fechaCalculo: new Date().toISOString().split('T')[0],
    },
  };
}
