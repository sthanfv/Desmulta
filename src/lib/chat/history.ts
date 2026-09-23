// Memoria de la conversación que se envía al agente de IA.
// [2026-09-22] Antes el agente rechazaba todo payload > 4 KB (HTTP 413): tras una sola respuesta
// larga, el historial superaba el límite y la web caía a una respuesta legal fija. Aquí se
// conservan los últimos mensajes, recortados y dentro de un presupuesto de bytes.

export type HistoryMessage = { role: 'user' | 'assistant'; content: string };

export const HISTORY_MAX_MESSAGES = 10;
export const HISTORY_MAX_CHARS = 1500;

export function trimHistory(
  history: HistoryMessage[] | undefined,
  basePayload: Record<string, unknown>,
  budgetBytes: number
): HistoryMessage[] {
  const trimmed = (history ?? []).slice(-HISTORY_MAX_MESSAGES).map((m) => ({
    role: m.role,
    content:
      m.content.length > HISTORY_MAX_CHARS
        ? `${m.content.slice(0, HISTORY_MAX_CHARS)}…`
        : m.content,
  }));
  const size = () =>
    new TextEncoder().encode(JSON.stringify({ ...basePayload, history: trimmed })).length;
  while (trimmed.length > 0 && size() > budgetBytes) {
    trimmed.shift();
  }
  return trimmed;
}
