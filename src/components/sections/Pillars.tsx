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
    <section id="servicios" className="py-32 px-4 relative">
      <div className="max-w-6xl mx-auto">
        <div className="text-center space-y-6 mb-20">
          <h2 className="text-2xl md:text-5xl font-black text-foreground tracking-tight reveal">
            Pilares de Autoridad Legal y Técnica
          </h2>
          <div className="w-24 h-2 bg-primary mx-auto rounded-full shadow-lg shadow-primary/20" />
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Card 1: Respaldo Normativo */}
          <TarjetaPremium className="reveal p-8 rounded-[2.5rem] backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-700 group flex items-start h-full">
            <div className="relative z-10 flex flex-col sm:flex-row gap-6 items-start w-full">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 shadow-inner shrink-0">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl md:text-2xl font-black text-foreground">
                  Respaldo Normativo
                </h3>
                <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                  Operamos bajo protocolos de gestión administrativa fundamentados en la normativa
                  vigente. Nuestro conocimiento del marco legal es la herramienta más sólida para
                  analizar su caso.
                </p>
              </div>
            </div>
          </TarjetaPremium>

          {/* Card 2: OCR Forense Client-Side (Rescatado de BentoDesmulta) */}
          <TarjetaPremium className="reveal p-8 rounded-[2.5rem] backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-700 group flex items-start h-full">
            <div className="relative z-10 flex flex-col sm:flex-row gap-6 items-start w-full">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 shadow-inner shrink-0">
                <FileSearch className="w-8 h-8" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl md:text-2xl font-black text-foreground">
                  OCR Forense Client-Side
                </h3>
                <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                  Analizamos tu captura de pantalla del SIMIT de forma local en tu navegador utilizando 
                  visión artificial. Tu imagen nunca viaja a servidores externos, garantizando privacidad 
                  absoluta desde el primer segundo.
                </p>
              </div>
            </div>
          </TarjetaPremium>

          {/* Card 3: Gestión Especializada */}
          <TarjetaPremium className="reveal p-8 rounded-[2.5rem] backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-700 group flex items-start h-full">
            <div className="relative z-10 flex flex-col sm:flex-row gap-6 items-start w-full">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 shadow-inner shrink-0">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl md:text-2xl font-black text-foreground">
                  Gestión Especializada
                </h3>
                <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                  Trato directo y profesional centrado en la resolución administrativa personalizada
                  de su historial vial.
                </p>
              </div>
            </div>
          </TarjetaPremium>

          {/* Card 4: Eficiencia Comprobada */}
          <TarjetaPremium className="reveal p-8 rounded-[2.5rem] backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-700 group flex items-start h-full">
            <div className="relative z-10 flex flex-col sm:flex-row gap-6 items-start w-full">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 shadow-inner shrink-0">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl md:text-2xl font-black text-foreground">
                  Eficiencia Comprobada
                </h3>
                <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                  Conocemos los términos exactos que la ley impone a cada organismo de tránsito — y
                  sabemos cuándo no los cumplen.
                </p>
              </div>
            </div>
          </TarjetaPremium>
        </div>
      </div>
    </section>
  );
};
