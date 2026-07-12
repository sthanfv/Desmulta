'use client';

import { LazyMotion, domAnimation, MotionConfig } from 'framer-motion';
import { ReactNode } from 'react';

/**
 * MotionProvider — Proveedor global de animaciones optimizadas.
 * Consolida LazyMotion en un solo punto para evitar conflictos de renderizado (flickering).
 */
export function MotionProvider({ children, nonce }: { children: ReactNode; nonce?: string }) {
  return (
    <MotionConfig nonce={nonce}>
      <LazyMotion features={domAnimation} strict>
        {children}
      </LazyMotion>
    </MotionConfig>
  );
}
