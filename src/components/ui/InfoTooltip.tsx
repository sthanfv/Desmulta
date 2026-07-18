'use client';

import * as React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  content: React.ReactNode;
  label: string; // Para lectores de pantalla (aria-label)
}

/**
 * InfoTooltip — Componente híbrido premium de información táctil y hover.
 *
 * - En PC reacciona al hover (Mouse Enter/Leave).
 * - En dispositivos móviles reacciona al toque (Tap/Click).
 * - Cumple con WCAG 2.5.5 AAA para áreas de toque cómodas (mínimo 44x44px).
 * - Diseñado con estética de cristal esmerilado (Glassmorphism).
 */
export function InfoTooltip({ content, label }: InfoTooltipProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Información sobre ${label}`}
          // Área de interacción cómoda de 44x44px (w-11 h-11)
          className="inline-flex items-center justify-center w-11 h-11 rounded-full
                     text-muted-foreground hover:text-primary transition-all duration-300
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
                     active:scale-95 shrink-0"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onClick={() => setOpen((prev) => !prev)}
        >
          <Info className="w-5 h-5" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={6}
        className="w-72 text-sm text-white/90 font-medium tracking-tight rounded-2xl p-4
                   bg-slate-950/90 dark:bg-black/90 backdrop-blur-xl border border-white/10
                   shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_20px_40px_rgba(0,0,0,0.6)]
                   animate-in fade-in-0 zoom-in-95"
        onInteractOutside={() => setOpen(false)}
      >
        <div className="space-y-3">
          <div className="leading-relaxed">{content}</div>
          {/* Botón de cierre visible para interacciones táctiles en pantallas móviles */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full text-center text-xs font-bold text-primary hover:text-primary/80
                       transition-colors py-2 rounded-xl bg-white/5 hover:bg-white/10"
            aria-label="Cerrar ventana de información"
          >
            Entendido
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
