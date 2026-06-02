/**
 * Motor de Triage Técnico v1.1.0 - Desmulta Élite (Telegram Edition)
 * Determina la urgencia y genera borradores de asesoría formateados para Telegram.
 * MANDATO-FILTRO: Heurísticas basadas en Sentencia C-038 y Art. 159 CNT.
 */

export interface TriageResult {
  priority: 'ALTA' | 'MEDIA' | 'NORMAL';
  technicalDraft: string;
  triggers: string[];
}

/**
 * Analiza el texto crudo del SIMIT para determinar el estado técnico.
 * Soporta formato Markdown para mayor legibilidad en Telegram.
 *
 * @param ocrText - Texto extraído mediante Tesseract.js
 */
export function analyzeTechnicalCase(ocrText: string): TriageResult {
  if (!ocrText) {
    return {
      priority: 'NORMAL',
      technicalDraft: 'Hola equipo Desmulta, deseo iniciar mi estudio de viabilidad gratuito.',
      triggers: [],
    };
  }

  const text = ocrText.toLowerCase();
  const triggers: string[] = [];
  let priority: 'ALTA' | 'MEDIA' | 'NORMAL' = 'NORMAL';

  // Base del mensaje para Telegram
  let technicalDraft = 'Hola equipo Desmulta, acabo de escanear mi caso en la web.\n\n';

  // Heurística 1: Detección de Cobro Coactivo (Prioridad Crítica)
  if (text.includes('coactivo') || text.includes('embargo') || text.includes('mandamiento')) {
    priority = 'ALTA';
    triggers.push('COBRO_COACTIVO');
    technicalDraft +=
      '🚨 *ALERTA:* El sistema detectó un posible COBRO COACTIVO. Hay riesgo de embargo.\n';
  }

  // Heurística 2: Detección de Fotomultas (Sentencia C-038)
  if (text.includes('fotomulta') || text.includes('sait') || text.includes('camara')) {
    if (priority === 'NORMAL') priority = 'MEDIA';
    triggers.push('FOTOMULTA');
    technicalDraft +=
      '📷 *TIPO:* Fotomulta detectada. Solicito revisión de caducidad (Sentencia C-038).\n';
  }

  // Heurística 3: Prescripción (Años antiguos - Art. 159 CNT)
  const matchYear = text.match(/201[0-9]|202[0-2]/);
  if (matchYear && !triggers.includes('POSIBLE_PRESCRIPCION')) {
    triggers.push('POSIBLE_PRESCRIPCION');
    technicalDraft += `⏳ *ANTIGÜEDAD:* Multa del año ${matchYear[0]}. Posible prescripción (Art. 159 CNT).\n`;
  }

  // Heurística 4: Alcoholemia / Embriaguez (Casos Complejos Ley 1696)
  if (text.includes('alcoholemia') || text.includes('embriaguez') || text.includes('grado')) {
    priority = 'ALTA';
    triggers.push('ALCOHOLEMIA');
    technicalDraft +=
      '🍷 *GRAVEDAD:* Posible caso de alcoholemia detectado. Requiere atención técnica especializada prioritaria.\n';
  }

  // Heurística 5: Incumplimiento de Acuerdo de Pago
  if (text.match(/acuerdo\s*de\s*pago/) || text.includes('incumplimiento')) {
    priority = 'ALTA';
    triggers.push('INCUMPLIMIENTO_ACUERDO');
    technicalDraft +=
      '⚠️ *ALERTA FINANCIERA:* Detectado posible incumplimiento de acuerdo de pago. Riesgo de ejecución inminente.\n';
  }

  // Heurística 6: Suspensión de Licencia
  if (text.match(/suspensio|suspensión|resolucion|retenida/)) {
    priority = 'ALTA';
    triggers.push('SUSPENSION_LICENCIA');
    technicalDraft +=
      '🛑 *SANCIÓN DE MOVILIDAD:* Posible resolución de suspensión o retención de licencia de conducción.\n';
  }

  technicalDraft += '\n¿Podemos iniciar el estudio de viabilidad o blindaje de mi caso?';

  return { priority, technicalDraft, triggers };
}
