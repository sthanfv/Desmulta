'use client';

import React from 'react';
import { m, LazyMotion, domAnimation } from 'framer-motion';

interface Props {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  className?: string;
}

export function ClientAnimatedTitle({ title, subtitle, className = '' }: Props) {
  return (
    <LazyMotion features={domAnimation}>
      <m.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, type: 'spring', stiffness: 200, damping: 20 }}
        className={className}
      >
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-4 md:mb-6 leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
            {subtitle}
          </p>
        )}
      </m.div>
    </LazyMotion>
  );
}
