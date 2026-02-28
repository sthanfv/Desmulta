'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, CheckCircle2, Zap, Clock, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DESMULTA_KB } from '@/lib/ai/knowledge-base';

export default function ServiciosPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden selection:bg-primary/30">
      {/* Background elements consistent with main page */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(255,191,0,0.05)_0%,transparent_40%)] pointer-events-none" />

      {/* Header */}
      <header className="fixed top-0 w-full z-50 p-6">
        <div className="max-w-4xl mx-auto glass rounded-3xl px-8 h-16 flex items-center justify-between shadow-2xl border-white/10">
          <Link
            href="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all group active:scale-95"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold text-sm">Inicio</span>
          </Link>
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-primary" size={20} />
            <span className="font-black tracking-tighter text-lg uppercase text-foreground">
              Servicios
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-36 pb-24">
        <div className="mb-20 animate-in fade-in slide-in-from-bottom-4 duration-700 text-center">
          <h1 className="text-5xl md:text-7xl font-black mb-6 text-foreground tracking-tight leading-[0.95]">
            Nuestro <br />
            <span className="text-primary italic underline decoration-primary/20 underline-offset-8">
              Portafolio
            </span>
          </h1>
          <p className="text-xl text-muted-foreground font-medium max-w-2xl mx-auto">
            Soluciones técnicas y legales diseñadas para restaurar su tranquilidad vial en toda
            Colombia.
          </p>
        </div>

        <div className="grid gap-12">
          {DESMULTA_KB.servicios.map((servicio, idx) => (
            <div
              key={idx}
              className="floating-card bg-card/40 backdrop-blur-sm border border-white/10 p-10 md:p-16 rounded-[3.5rem] relative group overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                <Zap size={180} className="text-primary" />
              </div>

              <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <div className="inline-flex px-4 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20">
                    Servicio Profesional
                  </div>
                  <h2 className="text-3xl md:text-4xl font-black text-foreground leading-tight">
                    {servicio.titulo}
                  </h2>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {servicio.descripcion}
                  </p>

                  <div className="flex flex-wrap gap-4 pt-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-foreground/70">
                      <Clock size={16} className="text-primary" />
                      <span>{servicio.tiempos || 'Proceso Ágil'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-bold text-foreground/70">
                      <Globe size={16} className="text-primary" />
                      <span>Cobertura Nacional</span>
                    </div>
                  </div>
                </div>

                <div className="glass bg-white/5 p-8 rounded-[2.5rem] border-white/5 shadow-inner">
                  <h4 className="text-xs font-black uppercase tracking-widest text-primary mb-6">
                    Detalles Técnicos
                  </h4>
                  <ul className="space-y-4">
                    {servicio.proceso && (
                      <li className="flex gap-4">
                        <CheckCircle2 size={18} className="text-primary shrink-0 mt-1" />
                        <p className="text-sm font-medium text-muted-foreground">
                          {servicio.proceso}
                        </p>
                      </li>
                    )}
                    <li className="flex gap-4">
                      <CheckCircle2 size={18} className="text-primary shrink-0 mt-1" />
                      <p className="text-sm font-medium text-muted-foreground">
                        Análisis de estado de cuenta SIMIT gratuito.
                      </p>
                    </li>
                    <li className="flex gap-4">
                      <CheckCircle2 size={18} className="text-primary shrink-0 mt-1" />
                      <p className="text-sm font-medium text-muted-foreground">
                        Protocolo de seguridad RSA 256-bit.
                      </p>
                    </li>
                  </ul>
                  <Button
                    asChild
                    className="w-full mt-10 h-14 rounded-2xl bg-primary text-primary-foreground font-black shadow-lg shadow-primary/20"
                  >
                    <Link href="/?action=consultar">Solicitar Información</Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="py-20 text-center opacity-40">
        <p className="text-[10px] font-black uppercase tracking-[0.3em]">
          Desmulta Colombia • Saneamiento Vial Premium
        </p>
      </footer>
    </div>
  );
}
