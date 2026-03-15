'use client';

import { LazyMotion, domAnimation, m } from 'framer-motion';

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  className?: string;
}

/**
 * Reveal v1.1.0 - Optimizador de Animación Lazy
 * Utiliza LazyMotion para cargar el motor de animación solo bajo demanda, optimizando el LCP.
 * Soporta className para integración directa en layouts complejos (grids, flex).
 */
export function Reveal({ children, delay = 0, direction = 'up', className }: RevealProps) {
  const directions = {
    up: { y: 40, x: 0 },
    down: { y: -40, x: 0 },
    left: { x: 40, y: 0 },
    right: { x: -40, y: 0 },
  };

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        className={className}
        initial={{ opacity: 0, ...directions[direction] }}
        whileInView={{ opacity: 1, x: 0, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{
          duration: 0.7,
          delay: delay,
          ease: [0.21, 0.47, 0.32, 0.98], // Curva de aceleración cinematográfica (Apple-like)
        }}
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}
