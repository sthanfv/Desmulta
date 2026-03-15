'use client';

import { useEffect, useState } from 'react';

/**
 * AuroraBackground - Fondo dinámico de "Luz Líquida".
 * Optimizado para Android/iPhone reduciendo la carga de esferas.
 */
export default function AuroraBackground() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detección simple para optimizar procesadores móviles
    setIsMobile(/Android|iPhone/i.test(navigator.userAgent));
  }, []);

  return (
    <div className="aurora-bg" aria-hidden="true">
      {/* Blobs de luz dinámicos */}
      <div className="aurora-blob blob-primary" />

      {/* Solo renderizamos el segundo blob en Desktop para cuidar el hardware móvil */}
      {!isMobile && <div className="aurora-blob blob-secondary" />}

      {/* Grano sutil estilo iOS 17/Vercel que oculta el banding de gradientes */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"
        style={{ backgroundRepeat: 'repeat' }}
      />

      {/* Capa de contraste para legibilidad */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background/50" />
    </div>
  );
}
