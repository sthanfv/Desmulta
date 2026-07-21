'use client';

import { LazyMotion, MotionConfig } from 'framer-motion';
import { ReactNode } from 'react';

const loadFeatures = () => import('@/lib/framer-features').then(res => res.default);

/**
 * MotionProvider — Proveedor global de animaciones optimizadas.
 * Consolida LazyMotion en un solo punto para evitar conflictos de renderizado (flickering).
 */
export function MotionProvider({ children, nonce }: { children: ReactNode; nonce?: string }) {
  return (
    <MotionConfig nonce={nonce}>
      <LazyMotion features={loadFeatures} strict>
        {children}
      </LazyMotion>
    </MotionConfig>
  );
}
