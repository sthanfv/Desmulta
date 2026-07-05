/**
 * OCR Utilities — Desmulta v8.4.0
 *
 * Lógica especializada para el procesamiento y extracción de datos desde
 * resultados de motores de OCR (Tesseract, Google Vision, etc.).
 */

/**
 * extractSimitData
 * Analiza un bloque de texto bruto extraído de una captura de pantalla del SIMIT
 * para identificar el número de documento y el nombre del ciudadano.
 *
 * @param rawText Texto extraído por el OCR
 * @returns { extractedId: string | null, extractedName: string | null }
 */
export const extractSimitData = (rawText: string) => {
  if (!rawText)
    return { extractedId: null, extractedName: null, totalDeuda: null, multasCount: null };

  // Regex para identificar Cédulas (CC, NIT, etc) de 5 a 12 dígitos
  const idRegex = /(?:C\.?C\.?|CEDULA|IDENTIFICACION)\s*:?\s*(\d{5,12})/i;

  // Regex para identificar Nombres (Busca patrones de texto en mayúsculas tras palabras clave)
  const nameRegex =
    /(?:NOMBRE|CIUDADANO|INFRACTOR|PROPIETARIO)\s*:?\s*([A-ZÁÉÍÓÚÑ\s]{5,50})(?=\n|\r|C\.?C\.?|DOCUMENTO|IDENTIFICACI[OÓ]N|$)/i;

  // Regex para Extraer Total a Pagar
  // Busca "Total:", opcionalmente un "$", espacios, y luego números con puntos
  const totalRegex = /Total\s*:?\s*\$?\s*([\d\.]+)/i;

  // Regex para extraer cantidad de Comparendos y Multas
  // Busca "Comparendos: X Multas: Y"
  const countsRegex = /Comparendos\s*:\s*(\d+)\s*Multas\s*:\s*(\d+)/i;

  const extractedId = rawText.match(idRegex)?.[1] || null;
  const extractedName = rawText.match(nameRegex)?.[1]?.trim() || null;

  const rawTotal = rawText.match(totalRegex)?.[1]?.replace(/\./g, '');
  const totalDeuda = rawTotal && !isNaN(Number(rawTotal)) ? Number(rawTotal) : null;

  const countsMatch = rawText.match(countsRegex);
  let multasCount = null;
  if (countsMatch) {
    multasCount = Number(countsMatch[1]) + Number(countsMatch[2]);
  }

  return { extractedId, extractedName, totalDeuda, multasCount };
};
