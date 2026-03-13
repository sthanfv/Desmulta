'use client';

import React from 'react';
import { ShieldCheck, ArrowUp, FileText, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { SavingsCounter } from '@/components/interactive/SavingsCounter';
import { TarjetaPremium } from '@/components/ui/TarjetaPremium';
import { Lightbox } from '@/components/ui/lightbox';
import { useExpedienteStore } from '@/store/useExpedienteStore';
import type { ShowcaseConfig } from '@/lib/site-config';

interface HeroProps {
  cityContext?: string;
  showcaseData: ShowcaseConfig;
  onConsultar: () => void;
}

/**
 * Hero - Sección de impacto principal.
 * MANDATO-FILTRO: Visualmente impactante y optimizada.
 */
export const Hero = ({ cityContext, showcaseData, onConsultar }: HeroProps) => {
  const { multas } = useExpedienteStore();

  return (
    <section className="min-h-[95vh] flex items-center pt-36 pb-24 px-4 relative overflow-hidden">
      <div className="absolute inset-0 z-0 overflow-hidden bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-background opacity-60 animate-pulse-slow mix-blend-screen" />
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-background to-transparent z-10" />
        <div className="absolute inset-0 hero-video-overlay z-10" />
      </div>
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 lg:gap-24 items-center relative z-20 w-full">
        <div className="space-y-10 lg:space-y-12 z-20">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 text-primary text-sm font-bold border border-primary/20 animate-in fade-in slide-in-from-left-4 duration-700 backdrop-blur-md shadow-[0_0_30px_rgba(255,191,0,0.15)]">
            <ShieldCheck size={18} className="animate-pulse" />
            <span className="tracking-wide">Trámite Administrativo Seguro</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-[5.5rem] font-black text-white tracking-tighter leading-tight reveal uppercase drop-shadow-2xl">
            {cityContext ? (
              <>
                MULTAS EN <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary/90 to-amber-200 italic drop-shadow-[0_0_30px_rgba(255,191,0,0.4)] pl-2 pr-5">
                  {cityContext}&nbsp;
                </span>
              </>
            ) : (
              <>
                RECUPERE <span className="text-white/90">SU</span> <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary/90 to-amber-200 italic drop-shadow-[0_0_30px_rgba(255,191,0,0.4)] px-4 -ml-4">
                  Liderazgo
                </span>
                <span className="text-white/90"> VIAL</span>
              </>
            )}
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-white/90 font-medium leading-[1.7] max-w-lg reveal reveal-delay-1 drop-shadow-md">
            {cityContext
              ? `¿Tienes comparendos pendientes en ${cityContext}? Blindaje legal experto para sus fotomultas y trámites administrativos con el tránsito local.`
              : 'Blindaje legal experto para sus trámites administrativos, fotomultas y comparendos. Saneamiento integral con absoluta reserva y transparencia corporativa.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <Button
              onClick={onConsultar}
              size="lg"
              className="h-16 sm:h-20 px-10 sm:px-12 text-lg sm:text-xl font-black rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_20px_40px_-15px_rgba(255,191,0,0.4)] active:scale-95 transition-all border-none relative overflow-hidden group/cta"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/cta:translate-y-0 transition-transform duration-300 ease-in-out" />
              <span className="relative flex items-center gap-3">
                INICIAR ESTUDIO SIN COSTO
                <ArrowUp className="w-6 h-6 rotate-45 group-hover/cta:translate-x-1 group-hover/cta:-translate-y-1 transition-transform" />
              </span>
            </Button>
          </div>
          {multas.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-primary/10 border border-primary/20 backdrop-blur-md flex items-center gap-4 group/expediente cursor-pointer hover:bg-primary/20 transition-all"
              onClick={onConsultar}
            >
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
                <FileText size={20} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-primary">
                  Expediente Activo
                </p>
                <p className="text-sm font-bold text-white">
                  Tienes {multas.length}{' '}
                  {multas.length === 1 ? 'multa detectada' : 'multas detectadas'} por analizar
                </p>
              </div>
              <ChevronRight
                size={16}
                className="text-primary ml-auto group-hover/expediente:translate-x-1 transition-transform"
              />
            </motion.div>
          )}

          <div className="pt-10">
            <SavingsCounter />
          </div>
        </div>

        <div className="relative group animate-in zoom-in-95 duration-1000 delay-200 z-10">
          <div className="absolute -inset-8 bg-primary/20 rounded-[4rem] blur-[80px] opacity-40 group-hover:opacity-60 transition-opacity duration-700 animate-slow-fade" />
          <TarjetaPremium className="relative floating-card p-4 overflow-hidden shadow-2xl rounded-[3rem]">
            <Lightbox
              src="/hero-bg.avif"
              alt="Gestión de multas profesional - Desmulta"
              className="rounded-[3rem] object-cover aspect-[4/5] shadow-2xl"
              priority
            />
            <div className="absolute bottom-8 left-8 right-8 z-10 pointer-events-none animate-float">
              <div className="glass p-4 rounded-3xl flex items-center gap-4 border-white/20 shadow-2xl">
                <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-black text-lg shadow-lg">
                  {showcaseData.counterValue || '754+'}
                </div>
                <div>
                  <div className="font-black text-sm text-foreground">
                    {showcaseData.counterLabel || 'Casos Exitosos'}
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Este mes en toda Colombia
                  </p>
                </div>
              </div>
            </div>
          </TarjetaPremium>
        </div>
      </div>
    </section>
  );
};
