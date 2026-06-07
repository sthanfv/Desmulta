'use client';

import React from 'react';
import { ArrowUp, FileText, ChevronRight, Shield } from 'lucide-react';
import { m } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { SavingsCounter } from '@/components/interactive/SavingsCounter';
import { TarjetaPremium } from '@/components/ui/TarjetaPremium';
import { Lightbox } from '@/components/ui/lightbox';
import { useExpedienteStore } from '@/store/useExpedienteStore';
import { ReturningUserBanner } from '@/components/vial-clear/ReturningUserBanner';
import type { ShowcaseConfig } from '@/lib/site-config';

interface HeroProps {
  cityContext?: string;
  showcaseData: ShowcaseConfig;
  onConsultar: () => void;
}

/**
 * Hero - Sección de impacto principal.
 * Tono corporativo-legal: autoridad, claridad y confianza institucional.
 */
export const Hero = ({ cityContext, showcaseData, onConsultar }: HeroProps) => {
  const { multas } = useExpedienteStore();

  return (
    <section className="min-h-[100svh] flex items-center pt-32 sm:pt-40 md:pt-48 pb-12 sm:pb-20 md:pb-24 px-4 relative overflow-hidden">
      {/* Atmósfera institucional — ámbar muy suave, sin neón */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/15 blur-[60px] sm:blur-[120px] opacity-50 rounded-full" />
        <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-background via-background/80 to-transparent z-10" />
      </div>

      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 lg:gap-24 items-center relative z-20 w-full">
        <div className="space-y-10 lg:space-y-12 z-20">
          {/* Badge institucional — sin giro, sin neón */}
          <m.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20 backdrop-blur-sm"
          >
            <Shield size={15} className="text-primary" />
            <span className="tracking-wide">Gestión administrativa vial</span>
          </m.div>

          {/* Titular — limpio, sin gradient italic naranja */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[6rem] font-bold text-foreground tracking-tighter leading-[0.95] pb-4">
            {cityContext ? (
              <>
                <m.span
                  className="block text-foreground/90"
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                >
                  MULTAS EN
                </m.span>
                <m.span
                  className="block text-primary font-bold"
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                >
                  {cityContext}
                </m.span>
              </>
            ) : (
              <>
                <m.span
                  className="block text-foreground/90"
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                >
                  Saneamos su historial.
                </m.span>
                <m.span
                  className="block text-primary font-bold"
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                >
                  Estratégicamente.
                </m.span>
              </>
            )}
          </h1>

          <m.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-base sm:text-lg md:text-xl text-muted-foreground font-medium leading-[1.7] max-w-lg"
          >
            {cityContext
              ? `¿Tiene comparendos pendientes en ${cityContext}? Le explicamos qué dice la ley sobre su caso específico. Sin cobro por el diagnóstico.`
              : '¿Tiene multas o comparendos en el SIMIT? Analizamos su caso sin costo y le decimos si hay argumentos legales para actuar — prescripción, caducidad o vicios de notificación.'}
          </m.p>

          {/* CTA primario — sólido, sin glow de 50px */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 pt-6"
          >
            <Button
              onClick={onConsultar}
              size="lg"
              className="h-14 sm:h-16 px-10 sm:px-12 text-base sm:text-lg font-semibold rounded-2xl shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-95 transition-all"
            >
              <span className="flex items-center gap-3">
                Iniciar estudio sin costo
                <ArrowUp className="w-5 h-5 rotate-45" />
              </span>
            </Button>
          </m.div>

          <div className="-mt-4 relative z-30">
            <ReturningUserBanner />
          </div>

          {multas.length > 0 && (
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-primary/10 border border-primary/20 backdrop-blur-md flex items-center gap-4 group/expediente cursor-pointer hover:bg-primary/15 transition-all"
              onClick={onConsultar}
            >
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md">
                <FileText size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                  Expediente Activo
                </p>
                <p className="text-sm font-bold text-foreground">
                  Tiene {multas.length}{' '}
                  {multas.length === 1 ? 'multa detectada' : 'multas detectadas'} por analizar
                </p>
              </div>
              <ChevronRight
                size={16}
                className="text-primary ml-auto group-hover/expediente:translate-x-1 transition-transform"
              />
            </m.div>
          )}

          <div className="pt-10">
            <SavingsCounter />
          </div>
        </div>

        {/* Imagen hero — visible desde lg, bordes contenidos */}
        <div className="relative group animate-in zoom-in-95 duration-1000 delay-200 z-10 hidden lg:block">
          <div className="absolute -inset-4 bg-primary/10 rounded-3xl blur-[60px] opacity-50 group-hover:opacity-70 transition-opacity duration-700" />
          <TarjetaPremium className="relative glass-ultra p-4 overflow-hidden shadow-2xl rounded-3xl">
            <Lightbox
              src="/hero-bg.avif"
              alt="Gestión de multas profesional - Desmulta"
              className="rounded-3xl object-cover aspect-[4/3] xl:aspect-[16/10] w-full shadow-xl"
              priority={true}
            />
            <div className="absolute bottom-8 left-8 right-8 z-10 pointer-events-none animate-float">
              <div className="glass p-4 rounded-2xl flex items-center gap-4 border-white/20 shadow-xl backdrop-blur-xl bg-black/40">
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shadow-md">
                  {showcaseData.counterValue || '754+'}
                </div>
                <div>
                  <div className="font-bold text-sm text-white">
                    {showcaseData.counterLabel || 'Casos Exitosos'}
                  </div>
                  <p className="text-xs text-white/70 font-medium">Este mes en toda Colombia</p>
                </div>
              </div>
            </div>
          </TarjetaPremium>
        </div>
      </div>
    </section>
  );
};
