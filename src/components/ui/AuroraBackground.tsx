'use client';

import { useReducedMotion } from 'framer-motion';

/**
 * AuroraBackground - Fondo dinámico de "Luz Líquida".
 * Optimizado para Android/iPhone reduciendo la carga de esferas.
 */
export default function AuroraBackground() {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return (
      <div className="aurora-bg" aria-hidden="true">
        {/* Grano sutil */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('/noise.svg')]"
          style={{ backgroundRepeat: 'repeat' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background/50" />
      </div>
    );
  }
  return (
    <div className="aurora-bg" aria-hidden="true">
      {/* Blobs de luz dinámicos */}
      <div className="aurora-blob blob-primary" />

      {/* 
          MANDATO-FILTRO: Optimizamos hardware mediante CSS (display: none en móviles).
          Esto evita el parpadeo de hidratación que causaba la detección por JS.
      */}
      <div className="aurora-blob blob-secondary hidden md:block" />

      {/* Grano sutil estilo iOS 17/Vercel que oculta el banding de gradientes */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('/noise.svg')]"
        style={{ backgroundRepeat: 'repeat' }}
      />

      {/* Capa de contraste para legibilidad */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background/50" />
    </div>
  );
}
