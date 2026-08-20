// ═══════════════════════════════════════════════════════════════════════
// 🛑 ALTO / STOP. LECTURA OBLIGATORIA / MANDATORY READING.
// 📜 src/lib/changelog.ts — Motor de Datos / Changelog Data Engine
// ═══════════════════════════════════════════════════════════════════════
//
// ⚠️ REGLA DE EJECUCIÓN (EXECUTION RULE):
// [ES] NO actualice este archivo automáticamente después de cada tarea menor.
// SOLO debe crear un nuevo registro cuando el Arquitecto dé la orden EXPLÍCITA
// de "actualizar versión", "cerrar feature" o "crear changelog".
//
// [EN] DO NOT auto-update this file after every minor task.
// ONLY create a new record when the Architect gives the EXPLICIT order to
// "bump version", "close feature", or "write changelog".
//
// -----------------------------------------------------------------------
// [ES] DIRECTIVA DEVSECOPS Y UI/UX (HACIA EL CIUDADANO)
// -----------------------------------------------------------------------
// 1. CERO PROVEEDORES: Jamás menciones marcas (Vercel, Firebase, AWS, etc.).
// 2. CERO STACK: Jamás menciones lenguajes o librerías (React, OCR, Tesseract).
// 3. OPACIDAD: Cero explicaciones técnicas. Explica solo el "QUÉ" y el "BENEFICIO".
// 4. NUEVOS ÍCONOS: Si creas un tag, añade ícono en `TAG_ICONS` y estilo en `getTagStyle`.
// 5. DOCS: Sincroniza la nueva función con la documentación interna (.md).
// ❌ INCORRECTO: "Mejora en Firebase..." ✅ CORRECTO: "Optimizamos el sistema..."
//
// ═══════════════════════════════════════════════════════════════════════

/**
 * Categorías válidas para los cambios o servicios.
 * Cada una tiene un color y un ícono asociado (ver `getTagStyle` y `TAG_ICONS`).
 */
export type ChangeTag = 'NUEVA FUNCIÓN' | 'SEGURIDAD' | 'CORRECCIÓN' | 'OPTIMIZACIÓN' | 'SERVICIO';

/**
 * Estructura de un registro de cambios (release).
 * Cada release agrupa los cambios de una versión bajo un título ciudadano.
 */
export interface ChangelogRelease {
  version: string;
  date: string;
  title: string;
  changes: {
    tag: ChangeTag;
    text: string;
  }[];
}

/**
 * Íconos por categoría de cambio.
 * Se muestran junto a la etiqueta de color dentro del widget.
 */
export const TAG_ICONS: Record<ChangeTag, string> = {
  'NUEVA FUNCIÓN': '✨',
  SEGURIDAD: '🔒',
  CORRECCIÓN: '🛠️',
  OPTIMIZACIÓN: '⚡',
  SERVICIO: '🚀',
};

// ═══════════════════════════════════════════════════════════════════════
// 📦 HISTORIAL DE CAMBIOS — La entrada más reciente va PRIMERO
// ═══════════════════════════════════════════════════════════════════════
export const changelogHistory: ChangelogRelease[] = [
  {
    version: '1.2.0',
    date: 'Agosto 2026',
    title: 'Radares de Tránsito y Portal VIP de Seguimiento',
    changes: [
      {
        tag: 'NUEVA FUNCIÓN',
        text: 'Directorio Nacional de Radares y Cámaras: Mapas interactivos para que conozcas la ubicación exacta de las Cámaras salvavidas autorizadas por la ANSV en tu ciudad.',
      },
      {
        tag: 'NUEVA FUNCIÓN',
        text: 'Buscador de Códigos de Infracción: Catlogo detallado de todas las multas de tránsito para que sepas cuánto debes pagar y cuáles son tus derechos.',
      },
      {
        tag: 'NUEVA FUNCIÓN',
        text: 'Portal VIP de Seguimiento: Acceso privado y seguro a un panel donde podrás monitorear el estado exacto de tus defensas y procesos.',
      },
      {
        tag: 'SEGURIDAD',
        text: 'Escudo de Alta Privacidad: Implementamos una red de seguridad activa avanzada que bloquea cualquier intento de suplantación y asegura tu información.',
      },
      {
        tag: 'OPTIMIZACIÓN',
        text: 'Navegacin Ultra Rápida para Mviles: Experimenta transiciones más fluidas, interfaces de nueva generacin y tiempos de carga instantneos desde cualquier celular.',
      },
    ],
  },
  {
    version: '1.1.0',
    date: '',
    title: 'Catálogo de Defensa y Directorio de Tránsito',
    changes: [
      {
        tag: 'NUEVA FUNCIÓN',
        text: 'Adquisición de Recursos de Defensa: Catálogo de plantillas jurídicas profesionales y personalizadas (prescripciones, fotomultas, tutelas) listas para descargar tras pago digital seguro.',
      },
      {
        tag: 'NUEVA FUNCIÓN',
        text: 'Directorio de Tránsito Inteligente: Ubicación y selección automática de los datos oficiales de contacto de las Secretarías de Movilidad de Colombia directamente en tu formulario.',
      },
      {
        tag: 'NUEVA FUNCIÓN',
        text: 'Panel de Novedades Educativas: Botón de lectura rápida en la explicación de multas del SIMIT para avanzar ágilmente en tu consulta.',
      },
      {
        tag: 'OPTIMIZACIÓN',
        text: 'Noticias y Novedades del Tránsito: Canal automático con artículos informativos para estar al día sobre fotomultas, embargos y nuevas leyes de movilidad.',
      },
      {
        tag: 'OPTIMIZACIÓN',
        text: 'CRM Interactivo para Asesores: Integración de notificaciones en tiempo real en la plataforma de asistencia para que nuestro equipo atienda tus solicitudes en segundos.',
      },
      {
        tag: 'SEGURIDAD',
        text: 'Protección de Datos Personales (Cero-Fugas): Cifrado digital hermético de tu información privada y sensible durante todo el proceso de análisis.',
      },
    ],
  },
  {
    version: '1.0.0',
    date: '',
    title: '¡Te damos la bienvenida a Desmulta!',
    changes: [
      {
        tag: 'SERVICIO',
        text: 'Análisis Inteligente: Sube la captura de tu consulta del SIMIT o la foto de tu comparendo. Nuestro sistema evalúa las variables para decirte qué tan viable es defenderlo.',
      },
      {
        tag: 'SERVICIO',
        text: 'Calculadora de Tiempo: Descubre exactamente cuánto tiempo ha pasado desde tu comparendo y ponte en contacto con nosotros para analizar tu caso.',
      },
      {
        tag: 'SERVICIO',
        text: 'Guía Legal para Ciudadanos: Artículos claros y sin enredos para que conozcas tus derechos frente a comparendos, fotomultas y embargos.',
      },
      {
        tag: 'SERVICIO',
        text: 'Programa de Referidos: Si ya eres cliente, ¡recomienda Desmulta y gana beneficios! (Próximamente para todos).',
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════
// 🎨 ESTILOS VISUALES — Colores para los tags en el widget
// ═══════════════════════════════════════════════════════════════════════
export const getTagStyle = (tag: ChangeTag) => {
  switch (tag) {
    case 'NUEVA FUNCIÓN':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-sm shadow-emerald-500/5';
    case 'SEGURIDAD':
      return 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20 shadow-sm shadow-violet-500/5';
    case 'CORRECCIÓN':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 shadow-sm shadow-amber-500/5';
    case 'OPTIMIZACIÓN':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 shadow-sm shadow-blue-500/5';
    case 'SERVICIO':
      return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 shadow-sm shadow-indigo-500/5';
    default:
      return 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20';
  }
};
