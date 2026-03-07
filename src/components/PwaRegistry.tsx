'use client';

import { useEffect } from 'react';

export function PwaRegistry() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Usamos sw-custom.js para evitar conflicto con el PWA Workbox preexistente
      navigator.serviceWorker
        .register('/sw-custom.js')
        .then((reg) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('SW activado:', reg.scope);
          }
        })
        .catch((err) => {
          if (process.env.NODE_ENV === 'development') {
            console.error('SW fallo:', err);
          }
        });
    }
  }, []);

  return null; // Componente invisible, solo ejecuta lógica
}
