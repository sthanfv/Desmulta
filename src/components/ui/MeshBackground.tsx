'use client';

import React, { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * MeshBackground — Fondo visual animado del sistema Desmulta Premium.
 *
 * MANDATO-FILTRO (Aurora Líquida Extrema):
 * - Se respeta `prefers-reduced-motion` para accesibilidad.
 * - En móvil se desactiva en CSS vía media queries para rendimiento óptimo.
 * - En escritorio genera un entorno inmersivo de luz líquida y ruido de alta frecuencia.
 */
interface ExtendedNavigator extends Navigator {
  deviceMemory?: number;
}

export function MeshBackground() {
  const reducedMotion = useReducedMotion();
  const [isLowTier, setIsLowTier] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const nav = navigator as ExtendedNavigator;
      const isLowMemory = nav.deviceMemory && nav.deviceMemory < 4;
      const isLowCores = navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4;
      if (isLowMemory || isLowCores) {
        setIsLowTier(true);
      }
    }
  }, []);

  if (reducedMotion || isLowTier) {
    return <div className="fixed inset-0 -z-20 bg-background" />;
  }

  return (
    <div className="aurora-bg">
      {/* Blob Principal (Dorado/Naranja) */}
      <div className="aurora-blob blob-primary" style={{ transform: 'translateZ(0)' }} />

      {/* Blob Secundario (Azul Eléctrico) */}
      <div className="aurora-blob blob-secondary" style={{ transform: 'translateZ(0)' }} />

      {/* Blob Terciario (Magenta/Púrpura) */}
      <div
        className="aurora-blob blob-tertiary hidden md:block"
        style={{ transform: 'translateZ(0)' }}
      />

      {/* Textura de ruido de alta resolución */}
      <div className="hidden md:block absolute inset-0 opacity-[0.025] mix-blend-overlay pointer-events-none bg-[url('/noise.svg')]" />
    </div>
  );
}
