/**
 * SecurityLogger: Motor de auditoría con ofuscación automática de PII (v2.3.7).
 * MANDATO-FILTRO: Protección estricta de datos personales en logs.
 */
/* eslint-disable security/detect-unsafe-regex */

/**
 * Filtro de seguridad MANDATO-FILTRO:
 * Sanitiza cualquier cadena de texto reemplazando PII con asteriscos.
 */
export const sanitizarPII = (mensaje: string): string => {
  if (!mensaje) return mensaje;

  let mensajeSeguro = mensaje;

  // 1. Ofuscar Teléfonos Móviles Colombianos (ej. 300 123 4567 o +573001234567)
  // Específico para Colombia (empiezan por 3)
  mensajeSeguro = mensajeSeguro.replace(
    /(\+?57)?\s*(3\d{2})\s*\d{5}\s*(\d{2})/g,
    (_, p1, p2, p3) => (p1 ? `${p1} ${p2}*****${p3}` : `${p2}*****${p3}`)
  );

  // 2. Ofuscar Cédulas de Ciudadanía (7 a 10 dígitos)
  // Solo si no fue procesado como teléfono (números que no empiezan por 3 si son de 10 dígitos, o de otros tamaños)
  // El \b asegura que no estemos en medio de otra palabra/número
  mensajeSeguro = mensajeSeguro.replace(/\b(\d{2})\d{3,6}(\d{2})\b/g, (match) => {
    // Si ya tiene asteriscos (fue procesado por el de teléfono), no lo tocamos
    if (match.includes('*')) return match;
    const start = match.slice(0, 2);
    const end = match.slice(-2);
    return `${start}****${end}`;
  });

  // 3. Ofuscar Correos Electrónicos
  mensajeSeguro = mensajeSeguro.replace(
    /\b([a-zA-Z0-9])[a-zA-Z0-9._%+-]*(@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g,
    '$1***$2'
  );

  return mensajeSeguro;
};

export const SecurityLogger = {
  info: (contexto: string, datos?: unknown) => {
    const logSanitizado = sanitizarPII(JSON.stringify(datos || {}));
    console.info(`[INFO] ${contexto}:`, logSanitizado);
  },
  warn: (contexto: string, datos?: unknown) => {
    const logSanitizado = sanitizarPII(JSON.stringify(datos || {}));
    console.warn(`[WARN] ${contexto}:`, logSanitizado);
  },
  error: (contexto: string, error?: unknown) => {
    const logSanitizado = sanitizarPII(JSON.stringify(error || {}));
    console.error(`[ERROR] ${contexto}:`, logSanitizado);
  },
  security: (contexto: string, datos?: unknown) => {
    const logSanitizado = sanitizarPII(JSON.stringify(datos || {}));
    console.warn(`[SECURITY EVENT] ${contexto}:`, logSanitizado);
  },
};

export const logger = SecurityLogger;
