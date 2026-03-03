'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'gold' | 'glass' | 'default';
}

/**
 * SkeletonPremium - MANDATO-FILTRO v5.4.1
 * Diseño High-Fidelity con estética Glassmorphism y degradados de la marca.
 */
export function SkeletonPremium({ className, variant = 'glass', ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-2xl relative overflow-hidden',
        variant === 'glass' && 'bg-white/5 dark:bg-white/[0.02] border border-white/10',
        variant === 'gold' && 'bg-primary/10 border border-primary/20',
        variant === 'default' && 'bg-muted/40',
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 dark:via-white/[0.05] to-transparent -translate-x-full animate-shimmer" />
    </div>
  );
}

/**
 * SkeletonCard - Representación premium para tarjetas de servicios o historias.
 */
export function SkeletonCard() {
  return (
    <div className="glass p-6 rounded-[2rem] border-white/10 space-y-4">
      <SkeletonPremium className="h-40 w-full rounded-2xl" />
      <div className="space-y-2">
        <SkeletonPremium className="h-6 w-3/4" />
        <SkeletonPremium className="h-4 w-1/2" />
      </div>
      <div className="flex gap-2 pt-2">
        <SkeletonPremium className="h-8 w-20 rounded-full" />
        <SkeletonPremium className="h-8 w-24 rounded-full" />
      </div>
    </div>
  );
}
