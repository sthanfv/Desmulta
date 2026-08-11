/**
 * TODAS LAS DECISIONES, ARCHIVOS Y CÓDIGO GENERADO DEBEN PASAR EL FILTRO
 * DE SEGURIDAD Y CALIDAD ‘MANDATO-FILTRO’
 *
 * Base de Conocimientos Corporativa de Desmulta (v4.0.2)
 * Definición de tipos estricta para estabilidad del sistema.
 */

export interface Servicio {
  id: string;
  titulo: string;
  descripcion: string;
  costo: string;
  proceso: string;
  tiempos: string;
  detalles?: string[];
  href?: string;
}

export interface Paso {
  numero: string;
  fase: string;
  detalle: string;
}

export interface FAQItem {
  pregunta: string;
  respuesta: string;
}

export interface KnowledgeBase {
  brand: {
    name: string;
    tagline: string;
    legalNature: string;
    mission: string;
  };
  temas_legales: {
    prescripcion: {
      definicion: string;
      tiempo_general: string;
      interrupcion: string;
    };
    fotomultas: {
      sentencia_clave: string;
      defensa: string;
    };
  };
  servicios: Servicio[];
  metodologia: {
    pasos: Paso[];
    tiempos: string;
  };
  faq: FAQItem[];
  contacto: {
    whatsapp: string;
    email: string;
  };
}

export const DESMULTA_KB: KnowledgeBase = {
  brand: {
    name: 'Desmulta Colombia',
    tagline: 'Tecnología Legal para su Tranquilidad Vial',
    legalNature: 'Facilitador y gestor administrativo especializado en derecho de tránsito.',
    mission:
      'Democratizar el acceso a la defensa administrativa vial en Colombia mediante tecnología y procesos técnicos rigurosos.',
  },
  temas_legales: {
    prescripcion: {
      definicion:
        'La prescripción es el término en el que la autoridad de tránsito pierde la facultad de cobro de una multa.',
      tiempo_general: 'Según el Artículo 159 del Código Nacional de Tránsito, 3 años iniciales.',
      interrupcion: 'Se interrumpe con el mandamiento de pago, iniciando otros 3 años.',
    },
    fotomultas: {
      sentencia_clave: 'Sentencia C-038 de 2020',
      defensa: 'Basada en la plena identificación del conductor infractor.',
    },
  },
  servicios: [
    {
      id: 'estudio-viabilidad',
      titulo: 'Estudio de Viabilidad',
      descripcion: 'Análisis profundo y gratuito del estado de cuenta.',
      costo: 'Gratuito',
      proceso: 'Consulta técnica en bases de datos institucionales.',
      tiempos: 'Inmediato',
      detalles: [
        'Consulta técnica en bases de datos institucionales.',
        'Análisis de estado de cuenta SIMIT gratuito.',
        'Protocolo de seguridad RSA 256-bit para protección Zero-PII.',
      ],
      href: '/?action=consultar',
    },
    {
      id: 'eliminacion-fotomultas',
      titulo: 'Gestión de Fotomultas',
      descripcion: 'Defensa técnica contra comparendos electrónicos.',
      costo: 'Sujeto a estudio',
      proceso: 'Protocolos de impugnación administrativa.',
      tiempos: '15 a 45 días hábiles',
      detalles: [
        'Protocolos de impugnación administrativa.',
        'Sustento en Sentencia C-038 de 2020 (plena identidad).',
        'Radicación electrónica directa con Secretaría de Tránsito.',
      ],
      href: '/?action=consultar',
    },
    {
      id: 'saneamiento-comparendos',
      titulo: 'Saneamiento de Comparendos',
      descripcion: 'Gestión de comparendos físicos con irregularidades.',
      costo: 'Sujeto a estudio',
      proceso: 'Radicación de defensas técnicas.',
      tiempos: '15 a 45 días hábiles',
      detalles: [
        'Evaluación de términos legales de prescripción y caducidad.',
        'Auditoría de notificación de cobro coactivo.',
        'Radicación de revocatorias directas y tutelas.',
      ],
      href: '/?action=consultar',
    },
    {
      id: 'calculadora',
      titulo: 'Calculadora de Multas',
      descripcion: 'Calcula el valor exacto de tus multas incluyendo intereses de mora de forma automática.',
      costo: 'Gratuito',
      proceso: 'Simulación financiera en tiempo real.',
      tiempos: 'Inmediato',
      detalles: [
        'Cálculo preciso de intereses moratorios vigentes.',
        'Soporte para resoluciones y fotomultas.',
        'Actualizado con tasas de usura certificadas.',
      ],
      href: '/calculadora',
    },

  ],
  metodologia: {
    pasos: [
      {
        numero: '01',
        fase: 'Certificación de Viabilidad',
        detalle: 'Filtro inicial de casos con sustento jurídico. Ejecutamos un análisis de telemetría legal evaluando tiempos de notificación, caducidad y cumplimiento estricto del debido proceso.',
      },
      {
        numero: '02',
        fase: 'Blindaje Administrativo',
        detalle: 'Radicación de defensas técnicas ante secretarías. Construimos el acervo probatorio y gestionamos la actuación administrativa con base en jurisprudencia y parámetros de la Superintendencia de Transporte.',
      },
      {
        numero: '03',
        fase: 'Certificación de Éxito',
        detalle: 'Soporte de eliminación y actualización SIMIT/RUNT. Realizamos trazabilidad y seguimiento continuo hasta que el organismo de tránsito profiera la resolución a favor y aplique la depuración en las bases de datos nacionales.',
      },
    ],
    tiempos: 'El tiempo estándar de resolución oscila entre 15 y 45 días calendario.',
  },
  faq: [
    {
      pregunta: '¿Cómo logran el saneamiento?',
      respuesta: 'Mediante protocolos de defensa administrativa legalmente sustentados.',
    },
    {
      pregunta: '¿Cuánto demora?',
      respuesta: 'Entre 15 y 45 días calendario.',
    },
  ],
  contacto: {
    whatsapp: '573005648309',
    email: 'contacto@desmulta.vercel.app',
  },
};
