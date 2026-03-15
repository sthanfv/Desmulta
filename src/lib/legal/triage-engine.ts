/**
 * Motor de Triage Legal v1.1.0 - Desmulta Élite (Telegram Edition)
 * Determina la urgencia y genera borradores de asesoría formateados para Telegram.
 * MANDATO-FILTRO: Heurísticas basadas en Sentencia C-038 y Art. 159 CNT.
 */

export interface TriageResult {
  priority: 'ALTA' | 'MEDIA' | 'NORMAL';
  legalDraft: string;
  triggers: string[];
}

/**
 * Analiza el texto crudo del SIMIT para determinar el estado jurídico.
 * Soporta formato Markdown para mayor legibilidad en Telegram.
 *
 * @param ocrText - Texto extraído mediante Tesseract.js
 */
export function analyzeLegalCase(ocrText: string): TriageResult {
  if (!ocrText) {
    return {
      priority: 'NORMAL',
      legalDraft: encodeURIComponent(
        'Hola equipo Desmulta, deseo iniciar mi estudio de viabilidad gratuito.'
      ),
      triggers: [],
    };
  }

  const text = ocrText.toLowerCase();
  const triggers: string[] = [];
  let priority: 'ALTA' | 'MEDIA' | 'NORMAL' = 'NORMAL';

  // Base del mensaje para Telegram
  let legalDraft = 'Hola equipo Desmulta, acabo de escanear mi caso en la web.\n\n';

  // Heurística 1: Detección de Cobro Coactivo (Prioridad Crítica)
  if (text.includes('coactivo') || text.includes('embargo') || text.includes('mandamiento')) {
    priority = 'ALTA';
    triggers.push('COBRO_COACTIVO');
    legalDraft +=
      '🚨 *ALERTA:* El sistema detectó un posible COBRO COACTIVO. Hay riesgo de embargo.\n';
  }

  // Heurística 2: Detección de Fotomultas (Sentencia C-038)
  if (text.includes('fotomulta') || text.includes('sait') || text.includes('camara')) {
    if (priority === 'NORMAL') priority = 'MEDIA';
    triggers.push('FOTOMULTA');
    legalDraft +=
      '📷 *TIPO:* Fotomulta detectada. Solicito revisión de caducidad (Sentencia C-038).\n';
  }

  // Heurística 3: Prescripción (Años antiguos - Art. 159 CNT)
  const matchYear = text.match(/201[0-9]|202[0-2]/);
  if (matchYear) {
    triggers.push('POSIBLE_PRESCRIPCION');
    legalDraft += `⏳ *ANTIGÜEDAD:* Multa del año ${matchYear[0]}. Posible prescripción (Art. 159 CNT).\n`;
  }

  legalDraft += '\n¿Podemos iniciar el proceso de eliminación?';

  return { priority, legalDraft, triggers };
}
