'use client';

// Importamos el contexto interno directamente para poder hacer un null-check
// en lugar de depender del throw del hook useOCR (que requería el Provider en root)
import { useOCR } from '@/components/ocr-provider';

/**
 * Hook de Pre-calentamiento del Motor OCR (MANDATO-FILTRO v8.9.4 — Lazy OCR)
 *
 * El OCRProvider ya NO está en el root layout. Ahora vive dentro del
 * ConsultationForm. Este hook es seguro para usar dentro de ese árbol.
 *
 * - Dentro del ConsultationForm: retorna el estado real del worker Tesseract.
 * - No debe usarse fuera del ConsultationForm (el Provider no estará disponible).
 */
export const useTesseractPrewarm = () => {
  const { isReady, error } = useOCR();
  return { isReady, error };
};

/**
 * Función legacy de prefetch — conservada por compatibilidad con imports dinámicos.
 * La inicialización real ocurre en OCRProvider al montar el ConsultationForm.
 */
export const prefetchTesseractModel = () => {
  if (process.env.NODE_ENV === 'development') {
    console.log(
      '[OCR] La inicialización ocurre en OCRProvider (lazy, dentro del ConsultationForm).'
    );
  }
};
