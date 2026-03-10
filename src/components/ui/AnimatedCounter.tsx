'use client';

import React, { useState, useEffect } from 'react';

interface AnimatedCounterProps {
  value: string;
  label: string;
  duration?: number;
}

/**
 * AnimatedCounter - Componente para mostrar contadores con animación de incremento.
 * MANDATO-FILTRO: UI interactiva y optimizada.
 */
export const AnimatedCounter = ({ value, label, duration = 2000 }: AnimatedCounterProps) => {
  const [count, setCount] = useState(0);
  const target = parseInt(value.replace(/\D/g, '')) || 0;
  const suffix = value.replace(/[0-9]/g, '');

  useEffect(() => {
    let start = 0;
    const end = target;
    if (start === end) return;

    const totalMilliseconds = duration;
    const incrementTime = totalMilliseconds / end > 10 ? totalMilliseconds / end : 10;
    const step = Math.ceil(end / (totalMilliseconds / incrementTime));

    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [target, duration]);

  return (
    <div className="flex flex-col items-center">
      <span className="text-4xl md:text-5xl font-black text-primary">
        {count.toLocaleString()}
        {suffix}
      </span>
      <span className="text-muted-foreground font-medium uppercase tracking-widest text-xs mt-2">
        {label}
      </span>
    </div>
  );
};
