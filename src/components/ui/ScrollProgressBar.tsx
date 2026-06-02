'use client';

import React from 'react';
import { LazyMotion, domAnimation, m, useScroll, useSpring, useReducedMotion } from 'framer-motion';

export function ScrollProgressBar() {
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const springValue = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  // Si el usuario prefiere movimiento reducido, usamos el valor bruto de scroll sin el "spring" (elástico)
  const scaleX = shouldReduceMotion ? scrollYProgress : springValue;

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50 z-[100] origin-left pointer-events-none"
        style={{ scaleX }}
      />
    </LazyMotion>
  );
}
