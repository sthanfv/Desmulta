'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import TextType from '@/components/ui/TextType';

interface CTAProps {
  onConsultar: () => void;
  onOpenSimitTutorial: () => void;
}

/**
 * CTA - Sección de Llamada a la Acción.
 * Tono corporativo-legal: formal, directo y sin efectos visuales excesivos.
 */
export const CTA = ({ onConsultar, onOpenSimitTutorial }: CTAProps) => {
  return (
    <section className="py-24 sm:py-32 md:py-48 px-4 mb-12 sm:mb-20">
      <div className="max-w-5xl mx-auto relative">
        <div className="relative bg-primary text-primary-foreground p-8 sm:p-14 md:p-20 rounded-3xl overflow-hidden text-center space-y-8 shadow-xl shadow-primary/10">
          {/* Luz ambiental sutil — opacity muy baja */}
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-white/8 rounded-full blur-[80px] pointer-events-none" />

          <h2 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-[1.05] relative z-10 text-balance">
            Su diagnóstico es gratuito.
            <br />
            <span className="text-xl md:text-3xl opacity-90 mt-2 block font-semibold">
              En menos de 24 horas sabrá si su caso tiene fundamento legal para actuar.
            </span>
          </h2>

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
              className="w-full sm:w-auto h-auto md:h-16 min-h-[3.5rem] px-4 md:px-12 bg-foreground text-background hover:bg-foreground/90 font-semibold rounded-2xl active:scale-95 transition-all text-base md:text-lg shadow-lg border-none relative overflow-hidden group flex flex-col items-center justify-center py-3"
            >
              <span className="relative z-10 block mb-1">SIMIT</span>
              <span className="relative z-10 text-[10px] md:text-xs font-medium opacity-80 block leading-tight text-center">
                Consulte en el portal oficial:
                <br className="md:hidden" />
                <span className="inline-block font-mono px-2 py-0.5 rounded ml-0 md:ml-1 mt-1 md:mt-0 tracking-wider">
                  <TextType
                    text={['simit.org.co', 'www.simit.org.co']}
                    typingSpeed={110}
                    pauseDuration={4000}
                    deletingSpeed={70}
                    showCursor={true}
                    cursorCharacter="_"
                    cursorClassName="opacity-70"
                  />
                </span>
              </span>
              <div className="absolute inset-0 bg-black/5 dark:bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
