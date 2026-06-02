'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { tesseractManager, type RecognizeResult } from '@/lib/ocr/tesseract-worker';
import type { RecognizeOptions } from 'tesseract.js';

interface OCRContextType {
  isReady: boolean;
  error: string | null;
  recognize: (image: string | File, options?: RecognizeOptions) => Promise<RecognizeResult>;
}

const OCRContext = createContext<OCRContextType | null>(null);

/**
 * OCRProvider — Proveedor de Contexto Saneado para el motor Tesseract.
 * Blindado contra SSR y doble inicialización en Strict Mode.
 */
export function OCRProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref para evitar inicializaciones duplicadas en React Strict Mode
  const initAttempted = useRef(false);

  useEffect(() => {
    let isMounted = true;

    if (typeof window !== 'undefined' && !initAttempted.current) {
      initAttempted.current = true;

      tesseractManager
        .init()
        .then(() => {
          if (isMounted) setIsReady(true);
        })
        .catch((err) => {
          if (isMounted) setError('Fallo en el motor de lectura óptica. Recarga la página.');
          console.error('[OCR] Pre-warming abortado:', err);
        });
    }

    return () => {
      isMounted = false;
      // No destruimos el worker aquí para permitir navegación SPA fluida
    };
  }, []);

  return (
    <OCRContext.Provider
      value={{
        isReady,
        error,
        recognize: tesseractManager.recognize.bind(tesseractManager) as (
          image: string | File,
          options?: RecognizeOptions
        ) => Promise<RecognizeResult>,
      }}
    >
      {children}
    </OCRContext.Provider>
  );
}

/**
 * Hook para consumir el motor OCR pre-calentado.
 */
export function useOCR() {
  const context = useContext(OCRContext);
  if (!context) {
    throw new Error('useOCR debe usarse dentro de un OCRProvider');
  }
  return context;
}
