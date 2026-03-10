'use client';

import React from 'react';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import { TarjetaPremium } from '@/components/ui/TarjetaPremium';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import type { ShowcaseConfig } from '@/lib/site-config';

interface PillarsProps {
  showcaseData: ShowcaseConfig;
}

/**
 * Pillars - Sección de Servicios y Autoridad Legal.
 * MANDATO-FILTRO: Estructura modular y limpia.
 */
export const Pillars = ({ showcaseData }: PillarsProps) => {
  return (
    <section id="servicios" className="py-32 px-4 relative">
      <div className="max-w-6xl mx-auto">
        <div className="text-center space-y-6 mb-20">
          <h2 className="text-2xl md:text-5xl font-black text-foreground tracking-tight reveal">
            Pilares de Autoridad Legal
          </h2>
          <div className="w-24 h-2 bg-primary mx-auto rounded-full shadow-lg shadow-primary/20" />
        </div>
        <div className="grid md:grid-cols-6 gap-6">
          <TarjetaPremium className="md:col-span-4 reveal p-10 rounded-[2.5rem] backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-700 group flex items-center">
            <div className="relative z-10 flex flex-col md:flex-row gap-10 items-center w-full">
              <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 shadow-inner">
                <ShieldCheck className="w-12 h-12" />
              </div>
              <div className="space-y-4 text-center md:text-left">
                <h3 className="text-2xl md:text-3xl font-black text-foreground">
                  Respaldo Normativo
                </h3>
                <p className="text-muted-foreground leading-relaxed text-lg md:text-xl max-w-xl">
                  Operamos bajo estrictos protocolos de defensa administrativa. Nuestro conocimiento
                  especializado es su mayor garantía frente a las autoridades de tránsito.
                </p>
              </div>
            </div>
          </TarjetaPremium>
          <div className="md:col-span-2 reveal reveal-delay-1 flex flex-col justify-center items-center text-center group">
            <TarjetaPremium className="p-10 w-full h-full flex flex-col justify-center items-center bg-primary/5 border-primary/20">
              <AnimatedCounter
                value={showcaseData.counterValue || '754+'}
                label={showcaseData.counterLabel || 'Casos Exitosos'}
              />
            </TarjetaPremium>
          </div>
          <div className="md:col-span-3 reveal reveal-delay-2 group">
            <TarjetaPremium className="p-10 h-full backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-700">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-foreground mb-4">Gestión Especializada</h3>
              <p className="text-muted-foreground leading-relaxed text-lg">
                Trato directo y profesional centrado en la resolución administrativa personalizada
                de su historial vial.
              </p>
            </TarjetaPremium>
          </div>
          <div className="md:col-span-3 reveal reveal-delay-3 group">
            <TarjetaPremium className="p-10 h-full backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-700">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-foreground mb-4">Eficiencia Comprobada</h3>
              <p className="text-muted-foreground leading-relaxed text-lg">
                Acompañamiento experto fundamentado en el estricto cumplimiento de los términos
                legales y la normativa vigente.
              </p>
            </TarjetaPremium>
          </div>
        </div>
      </div>
    </section>
  );
};
