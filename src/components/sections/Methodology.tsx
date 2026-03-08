'use client';

import React from 'react';
import { ShieldCheck, CheckCircle2, Lock, FileText, Info } from 'lucide-react';
import { TarjetaPremium } from '@/components/ui/TarjetaPremium';
import { cn } from '@/lib/utils';

/**
 * Methodology - Sección de Proceso, Metodología y Centro de Confianza.
 * MANDATO-FILTRO: Transparencia y seguridad comunicada.
 */
export const Methodology = () => {
  return (
    <section id="metodologia" className="py-32 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="glass p-6 sm:p-12 md:p-20 rounded-[2rem] md:rounded-[3rem] relative overflow-hidden border-white/10 shadow-3xl bg-white/5 dark:bg-white/[0.02]">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="relative grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="space-y-12">
              <div className="space-y-4">
                <h2 className="text-2xl md:text-4xl font-black text-foreground leading-tight reveal">
                  Proceso Ágil <br /> & Transparente
                </h2>
                <p className="text-base md:text-lg text-muted-foreground reveal reveal-delay-1">
                  Tres pasos para recuperar su historial crediticio y vial.
                </p>
              </div>
              <div className="grid gap-6">
                {[
                  {
                    num: '01',
                    title: 'Certificación de Viabilidad',
                    desc: 'Realizamos un análisis técnico profundo de su historial para determinar las probabilidades reales de exoneración.',
                    icon: <ShieldCheck className="w-6 h-6" />,
                  },
                  {
                    num: '02',
                    title: 'Blindaje Administrativo',
                    desc: 'Desplegamos protocolos de gestión administrativa especializados para fundamentar la corrección de su estado vial.',
                    icon: <ShieldCheck className="w-6 h-6" />,
                  },
                  {
                    num: '03',
                    title: 'Certificación Final',
                    desc: 'Confirmamos la resolución efectiva ante los portales institucionales y entregamos su acta de saneamiento.',
                    icon: <CheckCircle2 className="w-6 h-6" />,
                  },
                ].map((step, i) => (
                  <div
                    key={i}
                    className={cn(
                      'reveal group relative',
                      i === 0 ? 'reveal-delay-1' : i === 1 ? 'reveal-delay-2' : 'reveal-delay-3'
                    )}
                  >
                    <TarjetaPremium className="p-8 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-500">
                      <div className="flex gap-6 items-center">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 shadow-inner shrink-0">
                          {step.icon}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-black text-primary/40 tracking-widest uppercase">
                              {step.num}
                            </span>
                            <h3 className="text-lg md:text-xl font-black text-foreground">
                              {step.title}
                            </h3>
                          </div>
                          <p className="text-muted-foreground leading-relaxed text-xs md:text-base">
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    </TarjetaPremium>
                    {i < 2 && (
                      <div className="absolute left-7 -bottom-6 w-px h-6 bg-gradient-to-b from-primary/50 to-transparent hidden lg:block z-20" />
                    )}
                  </div>
                ))}
              </div>
            </div>
            {/* Lado Derecho: Centro de Confianza */}
            <div className="space-y-8 pt-4 lg:pt-0 reveal">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-card/60 backdrop-blur-md border border-white/5 shadow-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-xs font-black text-muted-foreground tracking-widest uppercase">
                    Plataforma Verificada
                  </span>
                </div>
                <h2 className="text-3xl md:text-5xl font-black text-foreground leading-tight tracking-tight">
                  Tu <span className="text-primary italic">tranquilidad</span> <br /> es nuestra
                  prioridad
                </h2>
                <p className="text-base md:text-xl text-muted-foreground font-medium">
                  Hacemos el trabajo difícil por ti con total transparencia. Protegemos tus datos
                  como si fueran nuestros y te hablamos con la verdad.
                </p>
              </div>

              <div className="grid gap-6 pt-4">
                {[
                  {
                    titulo: 'Privacidad y Habeas Data',
                    descripcion:
                      'Ley 1581 de 2012. Tus datos están encriptados y jamás serán compartidos con terceros.',
                    icon: <Lock className="w-6 h-6" />,
                  },
                  {
                    titulo: 'Transparencia Central',
                    descripcion:
                      'Somos un equipo certificado de gestores administrativos independientes. Sin costos ocultos — honorarios fijos por resultado.',
                    icon: <FileText className="w-6 h-6" />,
                  },
                  {
                    titulo: 'Infraestructura Segura',
                    descripcion:
                      'Plataforma con protocolos de grado empresarial (SSL/TLS), bloqueando accesos no autorizados.',
                    icon: <ShieldCheck className="w-6 h-6" />,
                  },
                ].map((pilar, i) => (
                  <div
                    key={i}
                    className={cn(
                      'reveal group relative',
                      i === 0 ? 'reveal-delay-1' : i === 1 ? 'reveal-delay-2' : 'reveal-delay-3'
                    )}
                  >
                    <TarjetaPremium className="p-6 md:p-8 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-500 h-full">
                      <div className="flex gap-6 items-center">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 shadow-inner shrink-0">
                          {pilar.icon}
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-lg md:text-xl font-black text-foreground">
                            {pilar.titulo}
                          </h3>
                          <p className="text-muted-foreground leading-relaxed text-xs md:text-base font-medium">
                            {pilar.descripcion}
                          </p>
                        </div>
                      </div>
                    </TarjetaPremium>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-12 md:mt-20 glass bg-primary/5 border-primary/20 p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] flex flex-col md:flex-row items-center gap-6 shadow-xl text-center md:text-left">
            <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-primary/20 mx-auto md:mx-0">
              <Info className="text-primary-foreground w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h4 className="text-xl font-black text-foreground uppercase tracking-tight">
                Nota sobre Honorarios
              </h4>
              <p className="text-muted-foreground text-sm md:text-base leading-relaxed font-medium">
                &quot;El estudio de viabilidad inicial es una cortesía para identificar sus
                oportunidades de saneamiento. La ejecución de trámites administrativos y gestión
                técnica genera honorarios de éxito que se ajustan según la complejidad de su
                caso.&quot;
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
