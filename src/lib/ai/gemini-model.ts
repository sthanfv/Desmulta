// Modelo de Gemini para la lectura de comparendos (OCR).
// [2026-09-23] 'gemini-2.5-flash' estaba escrito a mano en 3 rutas y Google lo retiró (HTTP 404):
// el OCR caía siempre a Lector-OCR. Los alias "-latest" los mantiene Google; se puede cambiar
// sin tocar código con la variable GEMINI_OCR_MODEL.
export const GEMINI_OCR_MODEL = process.env.GEMINI_OCR_MODEL || 'gemini-flash-lite-latest';
