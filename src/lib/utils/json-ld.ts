/**
 * Serializa de forma segura un objeto a una cadena JSON apta para JSON-LD,
 * escapando los caracteres '<' y '>' como caracteres unicode para prevenir
 * ataques de inyección de scripts (XSS) en la inyección dangerouslySetInnerHTML.
 */
export function safeJsonLdStringify(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}
