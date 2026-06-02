'use client';

import { LazyMotion, domAnimation } from 'framer-motion';
import { ReactNode } from 'react';

/**
 * MotionProvider — Proveedor global de animaciones optimizadas.
 * Consolida LazyMotion en un solo punto para evitar conflictos de renderizado (flickering).
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}
