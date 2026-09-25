'use client';

import React from 'react';
import { Button } from '@/components/ui/button';

interface CTAProps {
  onConsultar: () => void;
  onOpenSimitTutorial: () => void;
}

/**
 * CTA - Sección de Llamada a la Acción.
 * Tono corporativo-legal: formal, directo y sin efectos visuales excesivos.
 * Jerarquía: un solo botón principal (Consulta gratuita); SIMIT es secundario (contorno).
 */
export const CTA = ({ onConsultar, onOpenSimitTutorial }: CTAProps) => {
  return (
    <section className="py-10 md:py-24 px-4 mb-4 sm:mb-12">
      <div className="max-w-5xl mx-auto relative">
        <div className="relative bg-primary text-primary-foreground p-8 sm:p-14 md:p-20 rounded-3xl overflow-hidden text-center space-y-8 shadow-xl shadow-primary/10">
          {/* Luz ambiental sutil — opacity muy baja */}
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-white/8 rounded-full blur-[80px] pointer-events-none" />

          {/* [2026-09-24] El subtítulo estaba dentro del h2 y heredaba tracking-tighter (-0.05em):
              a 20-30px las palabras se pegaban. Ahora es un párrafo con espaciado normal. */}
          <div className="relative z-10 space-y-4">
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-[1.05] text-balance">
              Su diagnóstico es gratuito.
            </h2>
            <p className="text-xl md:text-2xl font-semibold opacity-90 max-w-2xl mx-auto text-balance leading-snug">
              En menos de 24 horas sabrá si su caso tiene fundamento legal para actuar.
            </p>
          </div>

          <p className="text-base md:text-lg opacity-85 max-w-xl mx-auto font-medium relative z-10 leading-relaxed">
            Nuestro equipo analiza su caso y le comunica la viabilidad legal sin compromiso.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center relative z-10">
            <Button
              onClick={onConsultar}
              size="lg"
              className="w-full sm:w-auto h-14 md:h-16 px-6 md:px-14 bg-foreground text-background hover:bg-foreground/90 font-semibold rounded-2xl active:scale-95 transition-all text-base md:text-lg shadow-lg border-none"
            >
              Consulta gratuita
            </Button>

            <Button
              onClick={onOpenSimitTutorial}
              size="lg"
              className="w-full sm:w-auto h-auto min-h-[3.5rem] md:min-h-16 px-4 md:px-10 bg-transparent text-primary-foreground hover:bg-black/5 border-2 border-primary-foreground/80 font-semibold rounded-2xl active:scale-95 transition-all text-base md:text-lg shadow-none relative overflow-hidden group flex flex-col items-center justify-center gap-0.5 py-2.5"
            >
              <span className="relative z-10 block">Consultar en SIMIT</span>
              <span className="relative z-10 text-xs font-medium opacity-80 block leading-tight">
                Portal oficial: <span className="font-mono">simit.org.co</span>
              </span>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
