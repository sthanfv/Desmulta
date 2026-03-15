'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface MagneticCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * MagneticCard v1.3.0 - Motor Táctil Desmulta (Elite DNA)
 * Refinado para Alta Visibilidad y compatibilidad total con eventos de UI.
 */
export function MagneticCard({ children, className, onClick }: MagneticCardProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current || isFocused) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleFocus = () => {
    setIsFocused(true);
    setOpacity(1);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setOpacity(0);
  };

  const handleMouseEnter = () => setOpacity(1);
  const handleMouseLeave = () => setOpacity(0);

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-3xl border border-border/40 bg-card/40 backdrop-blur-md transition-colors duration-500 hover:border-border',
        className
      )}
    >
      {/* El halo de luz magnética renderizado por GPU */}
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, hsl(var(--primary) / 0.12), transparent 40%)`,
        }}
      />

      {/* El contenido real de la tarjeta */}
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
}
