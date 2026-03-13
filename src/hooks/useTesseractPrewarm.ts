'use client';

import { useEffect, useRef } from 'react';

const LANG_URL = 'https://tessdata.projectnaptha.com/4.0.0/spa.traineddata.gz';

/**
 * Hook de Pre-calentamiento del Motor OCR (MANDATO-FILTRO v2.3.9)
 *
 * Estrategia: Iniciamos el Tesseract Worker en segundo plano tan pronto como
 * el componente del formulario se renderiza. El usuario no siente nada.
 * Mientras llena los campos, el modelo de 20MB ya está descargando en caché.
 * Cuando suba la foto, la validación OCR será prácticamente instantánea.
 */
export const useTesseractPrewarm = () => {
  // Ref para evitar doble inicialización en React Strict Mode
  const inicializado = useRef(false);

  useEffect(() => {
    if (inicializado.current) return;
    inicializado.current = true;

    // Prefetch silencioso del modelo de idioma español de Tesseract
    // El navegador lo guarda en caché automáticamente (y el SW lo persiste)
    const prefetch = document.createElement('link');
    prefetch.rel = 'prefetch';
    prefetch.href = LANG_URL;
    prefetch.as = 'fetch';
    prefetch.crossOrigin = 'anonymous';
    document.head.appendChild(prefetch);

    if (process.env.NODE_ENV === 'development') {
      console.log('[OCR] Pre-calentamiento del modelo spa.traineddata iniciado en segundo plano.');
    }

    return () => {
      // Limpieza: eliminamos el tag de prefetch para no contaminar el DOM
      if (document.head.contains(prefetch)) {
        document.head.removeChild(prefetch);
      }
    };
  }, []);
};
