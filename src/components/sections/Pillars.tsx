'use client';

import React from 'react';
import { ShieldCheck, CheckCircle2, FileSearch } from 'lucide-react';
import { TarjetaPremium } from '@/components/ui/TarjetaPremium';

/**
 * Pillars - Sección de Servicios y Autoridad Legal y Técnica.
 * Metodología simplificada en grid 2x2.
 */
export const Pillars = () => {
  return (
    <section id="servicios" className="py-24 md:py-40 px-4 relative">
      <div className="max-w-6xl mx-auto">
        <div className="text-center space-y-6 mb-16 md:mb-24">
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-black text-foreground tracking-tighter reveal text-balance">
            Por qué elegirnos para borrar sus multas
          </h2>
          <div className="w-24 h-2 bg-primary mx-auto rounded-full shadow-lg shadow-primary/20" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 auto-rows-fr">
          {/* Card 1: Respaldo Normativo */}
          <TarjetaPremium className="reveal md:col-span-2 p-8 md:p-12 rounded-[2.5rem] backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-700 group flex items-start h-full">
            <div className="relative z-10 flex flex-col sm:flex-row gap-6 items-start w-full">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 shadow-inner shrink-0">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl md:text-2xl font-black text-foreground">Conocemos la Ley</h3>
                <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                  Operamos 100% bajo la ley para analizar y resolver su caso. Nuestro conocimiento
                  de las normas de tránsito es su mejor y más sólida defensa.
                </p>
              </div>
            </div>
          </TarjetaPremium>

          {/* Card 2: OCR Forense Client-Side */}
          <TarjetaPremium className="reveal md:col-span-1 p-8 md:p-10 rounded-[2.5rem] backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-700 group flex items-start h-full">
            <div className="relative z-10 flex flex-col gap-6 items-start w-full">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 shadow-inner shrink-0">
                <FileSearch className="w-8 h-8" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl md:text-2xl font-black text-foreground">Privacidad Total</h3>
                <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                  Analizamos la foto de su multa usando tecnología segura directamente en su celular
                  o computador. Su información nunca viaja a servidores externos, garantizando que
                  nadie más la vea.
                </p>
              </div>
            </div>
          </TarjetaPremium>

          {/* Card 3: Gestión Especializada (1x1) */}
          <TarjetaPremium className="reveal md:col-span-1 p-8 md:p-10 rounded-[2.5rem] backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-700 group flex items-start h-full">
            <div className="relative z-10 flex flex-col sm:flex-row gap-6 items-start w-full">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 shadow-inner shrink-0">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl md:text-2xl font-black text-foreground">
                  Atención Personalizada
                </h3>
                <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                  Trato humano, directo y altamente profesional enfocado en solucionar su historial
                  vial lo más rápido posible.
                </p>
              </div>
            </div>
          </TarjetaPremium>

          {/* Card 4: Eficiencia Comprobada (2x1) */}
          <TarjetaPremium className="reveal md:col-span-2 p-8 md:p-10 rounded-[2.5rem] backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-700 group flex items-start h-full">
            <div className="relative z-10 flex flex-col sm:flex-row gap-6 items-start w-full">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 shadow-inner shrink-0">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl md:text-2xl font-black text-foreground">
                  Resultados Reales
                </h3>
                <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                  Sabemos exactamente cuándo los tránsitos cometen errores en el proceso de cobro, y
                  usamos esas fallas legales a su favor para eliminar la deuda.
                </p>
              </div>
            </div>
          </TarjetaPremium>
        </div>
      </div>
    </section>
  );
};
