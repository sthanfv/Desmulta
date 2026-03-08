'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import TextType from '@/components/ui/TextType';

interface CTAProps {
  onConsultar: () => void;
  onOpenSimitTutorial: () => void;
}

/**
 * CTA - Sección de Llamada a la Acción (Call to Action).
 * MANDATO-FILTRO: Conversión agresiva y segura.
 */
export const CTA = ({ onConsultar, onOpenSimitTutorial }: CTAProps) => {
  return (
    <section className="py-32 px-4 mb-32">
      <div className="max-w-6xl mx-auto relative group">
        <div className="absolute inset-0 bg-primary/20 rounded-[4rem] blur-[100px] scale-90 group-hover:scale-100 transition-transform duration-700 animate-slow-fade" />
        <div className="relative bg-primary text-primary-foreground p-16 md:p-32 rounded-[4rem] overflow-hidden text-center space-y-10 shadow-3xl shadow-primary/20 glow-box">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-white/10 rounded-full blur-[120px] pointer-events-none" />
          <h2 className="text-2xl md:text-5xl font-black tracking-tight leading-[0.9] relative z-10 selection:bg-white/20">
            Libérate hoy <br /> de las deudas.
          </h2>
          <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto font-medium relative z-10">
            No dejes que tu paz mental dependa de un comparendo injusto. Iniciemos tu defensa
            ahora.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center relative z-10">
            <Button
              onClick={onConsultar}
              size="lg"
              className="h-16 md:h-20 px-10 md:px-16 bg-foreground text-background hover:bg-foreground/90 font-black rounded-[2rem] active:scale-95 transition-all text-lg md:text-xl shadow-2xl border-none"
            >
              CONSULTA GRATIS
            </Button>
            <Button
              onClick={onOpenSimitTutorial}
              size="lg"
              className="h-auto md:h-20 min-h-[4rem] px-8 md:px-12 bg-foreground text-background hover:bg-foreground/90 font-black rounded-[2rem] active:scale-95 transition-all text-base md:text-xl shadow-2xl border-none relative overflow-hidden group flex flex-col items-center justify-center py-3"
            >
              <span className="relative z-10 block mb-1">SIMIT</span>
              <span className="relative z-10 text-[10px] md:text-xs font-semibold opacity-90 block leading-tight text-center">
                Entra a SIMIT oficial copiando en tu navegador:
                <br className="md:hidden" />
                <span className="inline-block font-mono text-background px-2 py-0.5 rounded ml-0 md:ml-1 mt-1 md:mt-0 tracking-wider">
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
