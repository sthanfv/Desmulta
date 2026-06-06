'use client';

import { useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MagneticCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * MagneticCard v1.0.0 — Motor Táctil GPU-First (Elite DNA)
 *
 * CAMBIO CRÍTICO v1.0.0: Migrado de useState (re-render en cada movimiento
 * del ratón) a useRef + mutación directa del DOM. El halo de luz se calcula
 * y aplica 100% fuera del ciclo de render de React, garantizando 60 FPS.
 */
export function MagneticCard({ children, className, onClick }: MagneticCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const divRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current || !haloRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (!shouldReduceMotion) {
      haloRef.current.style.background = `radial-gradient(600px circle at ${x}px ${y}px, hsl(var(--primary) / 0.12), transparent 40%)`;
    }
  };

  const handleMouseEnter = () => {
    if (haloRef.current) haloRef.current.style.opacity = '1';
  };

  const handleMouseLeave = () => {
    if (haloRef.current) haloRef.current.style.opacity = '0';
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={cn(
        'card-elevated relative overflow-hidden rounded-3xl border border-border/50 bg-card backdrop-blur-md transition-colors duration-500 hover:border-primary/30',
        className
      )}
    >
      {/* El halo de luz renderizado por GPU (estático si Reduced Motion está activo) */}
      <div
        ref={haloRef}
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300"
        style={{
          background: shouldReduceMotion ? 'rgba(255, 191, 0, 0.05)' : undefined,
        }}
      />

      {/* El contenido real de la tarjeta */}
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
}
