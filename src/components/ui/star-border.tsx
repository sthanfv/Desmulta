'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type StarBorderProps<T extends React.ElementType> = React.ComponentPropsWithoutRef<T> & {
  as?: T;
  className?: string;
  innerClassName?: string;
  children?: React.ReactNode;
  color?: string;
  speed?: string;
  borderWidth?: string;
  borderRadius?: string;
};

export const StarBorder = <T extends React.ElementType = 'div'>({
  as,
  className,
  innerClassName,
  color = '#F2C94C',
  speed = '6s',
  borderWidth = '1.5px',
  borderRadius = '1.5rem',
  children,
  ...rest
}: StarBorderProps<T>) => {
  const Component = as || 'div';

  return (
    <Component
      className={cn(
        "relative overflow-hidden p-[var(--border-width)]",
        className
      )}
      style={{
        '--border-width': borderWidth,
        '--border-radius': borderRadius,
        'borderRadius': 'var(--border-radius)',
        contain: 'content',
        ...(rest.style as object)
      } as React.CSSProperties}
      {...(rest as any)}
    >
      {/* Bot beam */}
      <div
        className="absolute bottom-[-20%] right-[-250%] w-[300%] h-[50%] opacity-80 rounded-full z-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${color} 0%, transparent 10%)`,
          animation: `star-movement-bottom ${speed} linear infinite alternate`,
          willChange: 'transform',
        }}
      />
      {/* Top beam */}
      <div
        className="absolute top-[-20%] left-[-250%] w-[300%] h-[50%] opacity-80 rounded-full z-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${color} 0%, transparent 10%)`,
          animation: `star-movement-top ${speed} linear infinite alternate`,
          willChange: 'transform',
        }}
      />
      
      {/* Inner content wrapper that hides the center of the gradient */}
      <div 
        className={cn("relative z-10 h-full w-full", innerClassName)}
        style={{ borderRadius: 'calc(var(--border-radius) - var(--border-width))' }}
      >
        {children}
      </div>
    </Component>
  );
};
