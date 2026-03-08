'use client';

import React from 'react';
import { Lightbox } from '@/components/ui/lightbox';
import type { ShowcaseConfig } from '@/lib/site-config';

interface SuccessCasesProps {
  showcaseData: ShowcaseConfig;
}

/**
 * SuccessCases - Sección de comparativa Antes/Después de casos reales.
 * MANDATO-FILTRO: Evidencia real de resultados.
 */
export const SuccessCases = ({ showcaseData }: SuccessCasesProps) => {
  return (
    <section className="py-32 px-4">
      <div className="max-w-4xl mx-auto text-center space-y-16">
        <div className="space-y-4">
          <h2 className="text-2xl md:text-4xl font-black text-foreground tracking-tight">
            Casos de Éxito
          </h2>
          <div className="flex flex-col items-center gap-2">
            <div className="text-3xl md:text-6xl font-black text-primary tracking-tighter">
              {showcaseData.counterValue || '500+'}
            </div>
            <div className="text-sm md:text-base font-black uppercase tracking-[0.3em] text-muted-foreground opacity-60">
              {showcaseData.counterLabel || 'Sanciones Eliminadas'}
            </div>
          </div>
          <p className="text-xl text-muted-foreground">
            Resultados reales verificados ante los organismos de tránsito
          </p>
        </div>
        {showcaseData.beforeImageUrl && showcaseData.afterImageUrl ? (
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <span className="text-sm font-black uppercase tracking-widest text-primary/60">
                Estado Anterior (Antes)
              </span>
              <div className="relative group p-2 rounded-[2.5rem] bg-gradient-to-br from-destructive/20 to-transparent shadow-Inner">
                <div className="floating-card bg-card border border-white/10 overflow-hidden p-0 shadow-2xl">
                  <Lightbox
                    src={showcaseData.beforeImageUrl}
                    alt="Evidencia antes del proceso"
                    className="aspect-[4/3] rounded-[2.5rem]"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <span className="text-sm font-black uppercase tracking-widest text-green-500/60">
                Resultado Final (Después)
              </span>
              <div className="relative group p-2 rounded-[2.5rem] bg-gradient-to-br from-green-500/20 to-transparent shadow-Inner">
                <div className="floating-card bg-card border border-white/10 overflow-hidden p-0 shadow-2xl">
                  <Lightbox
                    src={showcaseData.afterImageUrl}
                    alt="Evidencia después del proceso"
                    className="aspect-[4/3] rounded-[2.5rem]"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative group p-4 rounded-[4rem] bg-gradient-to-br from-primary/30 via-primary/5 to-transparent shadow-Inner opacity-50">
            <div className="floating-card bg-card/80 backdrop-blur-md overflow-hidden p-3 shadow-2xl border-white/10">
              <div className="aspect-[16/9] md:aspect-[21/9] relative rounded-[3rem] overflow-hidden flex items-center justify-center bg-muted/20">
                <p className="font-bold text-muted-foreground p-12">
                  Nuevos casos de éxito se están procesando...
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
