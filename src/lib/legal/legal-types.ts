/**
 * DESMULTA — Modelo de Datos Legal v4.0
 * ─────────────────────────────────────────────────────────────────────
 *
 * Este archivo define la arquitectura de tipos para el sistema documental.
 * REGLA DE ORO: Este archivo NO importa motores PDF ni acciones de servidor.
 * Solo tipado puro, constantes y helpers de clasificación.
 *
 * FAMILIAS DOCUMENTALES:
 *   FAMILIA A — Poder Especial (gestor actúa EN NOMBRE del ciudadano)
 *   FAMILIA B — Derecho de Petición Directo (ciudadano actúa POR SÍ MISMO)
 */

// ═══════════════════════════════════════════════════════════════════════
// SECCIÓN 1 — TIPOS DE PODER ESPECIAL (Familia A)
// Estos documentos requieren firma notarial o autógrafa del poderdante.
// El gestor Desmulta actúa en representación del ciudadano.
// ═══════════════════════════════════════════════════════════════════════

export type TipoPoder =
  | 'poder_peticion_general' // Poder para solicitar info general de multas
  | 'poder_prescripcion_3' // Poder para reclamar prescripción de 3 años (Art. 159 CNT)
  | 'poder_prescripcion_6' // Poder para doble prescripción 3+3 años (Art. 2535 CC)
  | 'poder_nulidad_fotomulta' // Poder para nulidad C-038/2020 (fotomultas)
  | 'poder_tutela'; // Poder para acción de tutela (Art. 86 CP)

// ═══════════════════════════════════════════════════════════════════════
// SECCIÓN 2 — TIPOS DE PETICIÓN DIRECTA (Familia B)
// El ciudadano firma y envía directamente a la entidad.
// Sin representante. Lenguaje en primera persona directa.
// ═══════════════════════════════════════════════════════════════════════

export type TipoPeticion =
  | 'peticion_informacion_general' // Solicitar estado de multas e historial completo
  | 'peticion_prescripcion_3' // Solicitar declaratoria de prescripción 3 años (Art. 159 CNT)
  | 'peticion_prescripcion_6' // Solicitar doble prescripción 3+3 años (T-645/2017)
  | 'peticion_nulidad_fotomulta' // Recurso directo de nulidad C-038/2020 + Art. 136 CNT
  | 'peticion_caducidad_sancion' // Caducidad sancionatoria >1 año sin resolución (Art. 52 Ley 1437)
  | 'peticion_paz_salvo'; // Paz y salvo definitivo + exclusión del SIMIT (Dec. 1898/2014)

// ═══════════════════════════════════════════════════════════════════════
// SECCIÓN 3 — UNIÓN Y FAMILIA
// ═══════════════════════════════════════════════════════════════════════

/** Unión de todos los tipos documentales del sistema */
export type TipoDocumentoLegal = TipoPoder | TipoPeticion;

/** Familia documental — determina el flujo y el motor de renderizado */
export type FamiliaDocumental = 'poder' | 'peticion';

// ═══════════════════════════════════════════════════════════════════════
// SECCIÓN 4 — SCHEMA DE PLANTILLAS DISPONIBLES
// Este es el campo que se almacena en Firestore para cada caso/consulta.
// Permite saber qué documentos están habilitados para ese expediente.
// ═══════════════════════════════════════════════════════════════════════

/**
 * Representa la configuración de un Derecho de Petición en un expediente.
 */
export interface ConfigPeticion {
  /** Si este tipo de petición es aplicable al caso */
  requerido: boolean;
  /** El tipo específico de petición (ej. prescripción 3 años) */
  tipo: TipoPeticion;
  /**
   * Fundamento legal principal resumido para mostrar al operador.
   * Ej: "Art. 159 CNT — Más de 3 años sin mandamiento"
   */
  fundamento?: string;
}

/**
 * Representa la configuración del Poder Especial en un expediente.
 */
export interface ConfigPoder {
  /** Si se requiere poder para este caso (Flujo 2: Representación) */
  requerido: boolean;
  /** El tipo de poder específico según la causal del caso */
  tipo: TipoPoder;
}

/**
 * SCHEMA PRINCIPAL — PlantillasDisponibles
 *
 * Este objeto se almacena en Firestore como campo `plantillasDisponibles`
 * dentro de cada documento de caso (`cases/{caseId}`).
 *
 * Origen único de verdad para determinar qué documentos generar.
 */
export interface PlantillasDisponibles {
  /** Poder Especial — Flujo de representación por gestor Desmulta */
  poder?: ConfigPoder;
  /** Derechos de Petición Directa — múltiples pueden aplicar simultáneamente */
  peticiones?: ConfigPeticion[];
  /** Fecha de última actualización del schema (ISO string) */
  actualizadoEn?: string;
  /** UID del operador que configuró las plantillas */
  configuradoPor?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// SECCIÓN 5 — ETIQUETAS DE INTERFAZ
// Labels para el selector del panel de administración.
// Organizados por familia para renderizar <optgroup>.
// ═══════════════════════════════════════════════════════════════════════

export const LABELS_PODER: Record<TipoPoder, string> = {
  poder_peticion_general: 'Poder — Solicitud de Información General',
  poder_prescripcion_3: 'Poder — Prescripción 3 Años (Art. 159 CNT)',
  poder_prescripcion_6: 'Poder — Doble Prescripción 3+3 Años (Cobro Coactivo)',
  poder_nulidad_fotomulta: 'Poder — Nulidad Fotomulta (C-038/2020)',
  poder_tutela: 'Poder — Acción de Tutela (Silencio Administrativo)',
};

export const LABELS_PETICION: Record<TipoPeticion, string> = {
  peticion_informacion_general: 'Petición — Información General de Multas',
  peticion_prescripcion_3: 'Petición — Prescripción 3 Años (Art. 159 CNT)',
  peticion_prescripcion_6: 'Petición — Doble Prescripción 3+3 Años',
  peticion_nulidad_fotomulta: 'Petición — Nulidad Fotomulta (C-038/2020)',
  peticion_caducidad_sancion: 'Petición — Caducidad Sancionatoria (Art. 52 Ley 1437)',
  peticion_paz_salvo: 'Petición — Paz y Salvo SIMIT (Decreto 1898/2014)',
};

/** Labels unificados para búsquedas y logging */
export const LABELS_TODOS: Record<TipoDocumentoLegal, string> = {
  ...LABELS_PODER,
  ...LABELS_PETICION,
};

// ═══════════════════════════════════════════════════════════════════════
// SECCIÓN 5.1 — CATÁLOGO DE CAUSALES DE TRÁNSITO
// Base de datos estática para la inyección dinámica de fundamentos en los PDF.
// ═══════════════════════════════════════════════════════════════════════

export const CAUSALES_TRANSITO = {
  causal_1_prescripcion_3_anios: {
    id: 'causal_1_prescripcion_3_anios',
    titulo: '1. Prescripción de 3 años (Sin Mandamiento de Pago)',
    normativa: 'Artículo 159 de la Ley 769 de 2002',
    plantilla_texto:
      'Que habiendo transcurrido más de tres (3) años desde la ocurrencia de la presunta infracción, la autoridad de tránsito no notificó el mandamiento de pago dentro del término legal, operando el fenómeno jurídico de la prescripción de la acción de cobro de pleno derecho.',
  },
  causal_2_caducidad_1_anio: {
    id: 'causal_2_caducidad_1_anio',
    titulo: '2. Caducidad de 1 año (Sin Resolución Sancionatoria)',
    normativa: 'Artículo 161 de la Ley 769 de 2002 y Artículo 52 de la Ley 1437 de 2011',
    plantilla_texto:
      'Que habiendo transcurrido más de un (1) año desde la ocurrencia de la presunta infracción, la administración no ha proferido ni notificado resolución sancionatoria alguna, perdiendo la facultad para imponer la sanción por el fenómeno de la caducidad administrativa.',
  },
  causal_3_fotomulta_identificacion: {
    id: 'causal_3_fotomulta_identificacion',
    titulo: '3. Nulidad Fotomulta (Indebida Identificación)',
    normativa: 'Sentencia C-038 de 2020 de la Corte Constitucional',
    plantilla_texto:
      'Que la infracción fue captada por medios electrónicos y la autoridad no individualizó plenamente al conductor infractor, pretendiendo hacer responsable al propietario del vehículo sin pruebas de su autoría, vulnerando el principio de responsabilidad personal y el debido proceso.',
  },
  causal_4_indebida_notificacion: {
    id: 'causal_4_indebida_notificacion',
    titulo: '4. Indebida Notificación (Fotomulta - Plazos de Ley)',
    normativa: 'Ley 1843 de 2017 y Sentencia T-051 de 2016',
    plantilla_texto:
      'Que la notificación del comparendo electrónico no se realizó dentro de los términos perentorios de ley (envío en 3 días y entrega efectiva), impidiendo el ejercicio del derecho de defensa y contradicción en las etapas iniciales del proceso contravencional.',
  },
  causal_5_falta_senalizacion: {
    id: 'causal_5_falta_senalizacion',
    titulo: '5. Falta de Señalización Técnica (Cámaras)',
    normativa: 'Artículo 10 de la Ley 1843 de 2017 y Res. 718 de 2018',
    plantilla_texto:
      'Que los sistemas de ayuda tecnológica (cámaras) no contaban con la señalización informativa de "Detección Electrónica" con la antelación mínima exigida por la ley (500 metros), lo cual invalida la detección por falta de cumplimiento de requisitos técnicos esenciales.',
  },
  causal_6_doble_prescripcion_6: {
    id: 'causal_6_doble_prescripcion_6',
    titulo: '6. Doble Prescripción de 6 años (Cobro Coactivo)',
    normativa: 'Sentencia T-645 de 2017 y Concepto 20191340409541 MinTransporte',
    plantilla_texto:
      'Que sumados los términos de prescripción de la sanción y la interrupción por cobro coactivo, han transcurrido más de seis (6) años sin que la administración haya logrado el recaudo efectivo de la obligación, operando la prescripción definitiva e irrenunciable del crédito fiscal.',
  },
  causal_7_falta_mandamiento: {
    id: 'causal_7_falta_mandamiento',
    titulo: '7. Nulidad por Falta de Mandamiento de Pago',
    normativa: 'Artículo 823 y 826 del Estatuto Tributario (Remisión Art. 162 CNT)',
    plantilla_texto:
      'Que la autoridad inició medidas cautelares y proceso de cobro coactivo sin haber notificado previamente el Mandamiento de Pago al deudor, acto administrativo indispensable para vincular legalmente al ciudadano al proceso ejecutivo, generando la nulidad de lo actuado.',
  },
  causal_8_caducidad_audiencia: {
    id: 'causal_8_caducidad_audiencia',
    titulo: '8. Caducidad Procesal (6 meses para Audiencia)',
    normativa: 'Artículo 161 de la Ley 769 de 2002',
    plantilla_texto:
      'Que habiéndose solicitado audiencia pública dentro del término, la autoridad de tránsito no la celebró ni decidió el fondo del asunto dentro de los seis (6) meses siguientes, operando la caducidad procesal por falta de impulso de la administración.',
  },
  causal_9_inexistencia_pruebas: {
    id: 'causal_9_inexistencia_pruebas',
    titulo: '9. Inexistencia de la Infracción (Falta de Pruebas)',
    normativa: 'Artículo 29 de la Constitución Política (Presunción de Inocencia)',
    plantilla_texto:
      'Que la orden de comparendo no cuenta con el soporte probatorio suficiente que demuestre la comisión de la conducta. En ausencia de pruebas técnicas o testimoniales veraces, debe prevalecer la presunción de inocencia del ciudadano.',
  },
  causal_10_comparendo_erroneo: {
    id: 'causal_10_comparendo_erroneo',
    titulo: '10. Comparendo Erróneo (Error en Datos Esenciales)',
    normativa: 'Artículo 135 de la Ley 769 de 2002 (Formulario Único Nacional)',
    plantilla_texto:
      'Que la orden de comparendo presenta errores u omisiones en datos esenciales como la placa del vehículo, lugar de los hechos o identificación del presunto infractor, lo cual vicia de nulidad el acto administrativo por falta de requisitos de forma.',
  },
} as const;

export type CausalTransitoId = keyof typeof CAUSALES_TRANSITO;

// ═══════════════════════════════════════════════════════════════════════
// SECCIÓN 6 — HELPERS DE CLASIFICACIÓN
// Funciones puras — sin efectos secundarios, sin imports externos.
// ═══════════════════════════════════════════════════════════════════════

const TIPOS_PODER = new Set<string>([
  'poder_peticion_general',
  'poder_prescripcion_3',
  'poder_prescripcion_6',
  'poder_nulidad_fotomulta',
  'poder_tutela',
]);

/**
 * Determina a qué familia pertenece un tipo de documento.
 * @returns 'poder' para Familia A, 'peticion' para Familia B
 */
export function getFamiliaDocumental(tipo: TipoDocumentoLegal): FamiliaDocumental {
  return TIPOS_PODER.has(tipo) ? 'poder' : 'peticion';
}

/**
 * Determina si un tipo de documento es un Poder Especial (Familia A).
 */
export function esPoder(tipo: TipoDocumentoLegal): tipo is TipoPoder {
  return TIPOS_PODER.has(tipo);
}

/**
 * Determina si un tipo de documento es una Petición Directa (Familia B).
 */
export function esPeticion(tipo: TipoDocumentoLegal): tipo is TipoPeticion {
  return !TIPOS_PODER.has(tipo);
}

/**
 * Genera las PlantillasDisponibles sugeridas automáticamente
 * a partir de los metadatos del caso (antigüedad, estado coactivo, tipo infracción).
 *
 * Esta función NO reemplaza la configuración manual del operador.
 * Es solo una sugerencia inicial para acelerar el flujo de trabajo.
 */
export function sugerirPlantillas(
  antiguedad?: string,
  estadoCoactivo?: string,
  tipoInfraccion?: string
): PlantillasDisponibles {
  const masde3 = antiguedad === 'Más de 3 años';
  const masde6 = estadoCoactivo === 'SÍ' && masde3;
  const esFotomulta =
    tipoInfraccion?.toLowerCase().includes('foto') ||
    tipoInfraccion?.toLowerCase().includes('cámara');

  // Determinar el poder más apropiado
  let tipoPoder: TipoPoder = 'poder_peticion_general';
  let tipoPeticion: TipoPeticion = 'peticion_informacion_general';
  let fundamento = 'Caso general — solicitar información inicial';

  if (masde6) {
    tipoPoder = 'poder_prescripcion_6';
    tipoPeticion = 'peticion_prescripcion_6';
    fundamento = 'Más de 6 años (3 original + 3 coactivo) — doble prescripción (T-645/2017)';
  } else if (masde3) {
    tipoPoder = 'poder_prescripcion_3';
    tipoPeticion = 'peticion_prescripcion_3';
    fundamento = 'Más de 3 años sin mandamiento — prescripción extintiva (Art. 159 CNT)';
  } else if (esFotomulta) {
    tipoPoder = 'poder_nulidad_fotomulta';
    tipoPeticion = 'peticion_nulidad_fotomulta';
    fundamento = 'Fotomulta — nulidad por indebida notificación (Sentencia C-038/2020)';
  }

  return {
    poder: {
      requerido: true,
      tipo: tipoPoder,
    },
    peticiones: [
      {
        requerido: true,
        tipo: tipoPeticion,
        fundamento,
      },
    ],
    actualizadoEn: new Date().toISOString(),
  };
}

/**
 * Prefijo del nombre de archivo según la familia del documento.
 * Garantiza distinción clara en el sistema de archivos del cliente.
 */
export function getPrefixFilename(tipo: TipoDocumentoLegal): string {
  return esPoder(tipo) ? 'PODER' : 'PETICION';
}
