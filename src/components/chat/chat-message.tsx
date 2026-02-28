/**
 * TODAS LAS DECISIONES, ARCHIVOS Y CÓDIGO GENERADO DEBEN PASAR EL FILTRO
 * DE SEGURIDAD Y CALIDAD ‘MANDATO-FILTRO’
 *
 * Componente de Visualización de Mensaje Pro v4.0.2
 * Estética iOS Glassmorphism
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { ShieldCheck, User } from 'lucide-react';

interface ChatMessageProps {
  role: 'user' | 'model';
  text: string;
}

export function ChatMessage({ role, text }: ChatMessageProps) {
  const isModel = role === 'model';

  return (
    <div
      className={cn(
        'flex w-full mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500',
        isModel ? 'justify-start' : 'justify-end'
      )}
    >
      <div className={cn('flex max-w-[88%] gap-3', isModel ? 'flex-row' : 'flex-row-reverse')}>
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-transform active:scale-90',
            isModel
              ? 'bg-primary/20 text-primary border border-primary/20'
              : 'bg-white/40 dark:bg-white/10 text-muted-foreground border border-white/20'
          )}
        >
          {isModel ? <ShieldCheck size={16} /> : <User size={16} />}
        </div>
        <div
          className={cn(
            'p-4 px-5 rounded-[2rem] text-[13px] leading-relaxed relative ring-1 ring-black/5 shadow-sm',
            isModel
              ? 'bg-white/60 dark:bg-white/10 backdrop-blur-md border border-white/50 dark:border-white/5 rounded-tl-none text-foreground font-medium'
              : 'bg-primary text-primary-foreground rounded-tr-none font-bold shadow-lg shadow-primary/10'
          )}
        >
          {text}
          {/* Subtle micro-reflection in dark mode model bubble */}
          {isModel && (
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 rounded-[2rem] pointer-events-none" />
          )}
        </div>
      </div>
    </div>
  );
}
