'use client';

import { useEffect } from 'react';

export function PwaRegistry() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Usamos sw-custom.js para evitar conflicto con el PWA Workbox preexistente
      navigator.serviceWorker
        .register('/sw-custom.js')
        .then((registration) =>
          console.log('Escudo Offline Activado (Custom Nivel Dios):', registration.scope)
        )
        .catch((err) => console.error('Fallo al registrar SW:', err));
    }
  }, []);

  return null; // Componente invisible, solo ejecuta lógica
}
