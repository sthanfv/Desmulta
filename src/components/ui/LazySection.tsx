'use client';

import React, { useState, useEffect, useRef } from 'react';

interface LazySectionProps {
  children: React.ReactNode;
  rootMargin?: string;
  minHeight?: string;
  className?: string;
}

/**
 * LazySection — Envoltura optimizada para Lighthouse (FCP / TBT)
 * Renderiza su contenido hijo SÓLO cuando entra en el viewport (o está cerca).
 * Previene la ejecución y evaluación masiva de JS durante la hidratación inicial.
 */
export function LazySection({
  children,
  rootMargin = '400px',
  minHeight = '300px',
  className = '',
}: LazySectionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin,
        threshold: 0,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ minHeight: isVisible ? 'auto' : minHeight }}
    >
      {isVisible ? children : null}
    </div>
  );
}
