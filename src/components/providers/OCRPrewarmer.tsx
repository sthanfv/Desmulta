'use client';

import { useEffect } from 'react';
import { tesseractManager } from '@/lib/ocr/tesseract-worker';

/**
 * OCRPrewarmer — Componente para inicializar el worker de Tesseract en segundo plano.
 * Esto cumple con el pilar de "Pre-warming" para reducir el tiempo de carga a 0ms
 * cuando el usuario decide subir una imagen.
 *
 * OPTIMIZACIÓN LIGHHOUSE (INP): Se retrasa 5 segundos la inicialización
 * para no bloquear la hidratación de React ni afectar la métrica de Interaction to Next Paint.
 */
export function OCRPrewarmer() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const timer = setTimeout(() => {
        // Silenciosamente inicializa el worker después de la carga inicial
        // y envía un PING a los microservicios en Render para despertarlos de su inactividad (Cold Start)
        if ('requestIdleCallback' in window) {
          window.requestIdleCallback(() => {
            tesseractManager.init().catch(() => {});
            fetch('/api/ocr').catch(() => {}); // Ping backend OCR (Python)
          });
        } else {
          tesseractManager.init().catch(() => {});
          fetch('/api/ocr').catch(() => {}); // Ping backend OCR (Python)
        }
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, []);

  return null;
}
