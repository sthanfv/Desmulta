'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Layers, FileText, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DESMULTA_KB } from '@/lib/ai/knowledge-base';

export default function MetodologiaPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden selection:bg-primary/30">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(255,191,0,0.05)_0%,transparent_40%)] pointer-events-none" />

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
              Método
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-36 pb-24">
        <div className="mb-20 animate-in fade-in slide-in-from-bottom-4 duration-700 text-center">
          <h1 className="text-5xl md:text-7xl font-black mb-6 text-foreground tracking-tight leading-[0.95]">
            Cómo lo <br />
            <span className="text-primary italic underline decoration-primary/20 underline-offset-8">
              Hacemos
            </span>
          </h1>
          <p className="text-xl text-muted-foreground font-medium max-w-2xl mx-auto">
            Protocolos técnicos de alta precisión que garantizan resultados ante la justicia
            administrativa.
          </p>
        </div>

        <div className="space-y-8">
          {DESMULTA_KB.metodologia.pasos.map((paso, idx) => (
            <div key={idx} className="flex gap-6 md:gap-12 relative items-start group">
              {/* Number Bubble */}
              <div className="w-16 h-16 md:w-24 md:h-24 rounded-[2rem] bg-card border border-white/10 flex items-center justify-center shrink-0 shadow-2xl group-hover:bg-primary transition-colors group-hover:border-primary/50">
                <span className="text-2xl md:text-4xl font-black text-foreground group-hover:text-primary-foreground transition-colors leading-none">
                  {paso.numero}
                </span>
              </div>

              {/* Card Content */}
              <div className="flex-1 bg-card/40 backdrop-blur-sm p-8 md:p-12 rounded-[2.5rem] border border-white/5 shadow-xl group-hover:border-primary/20 transition-all">
                <h3 className="text-2xl md:text-3xl font-black text-foreground mb-4">
                  {paso.fase}
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed">{paso.detalle}</p>

                <div className="mt-8 flex gap-6 opacity-40 group-hover:opacity-100 transition-opacity">
                  {idx === 0 && <Layers className="text-primary" size={24} />}
                  {idx === 1 && <FileText className="text-primary" size={24} />}
                  {idx === 2 && <ClipboardCheck className="text-primary" size={24} />}
                </div>
              </div>

              {/* Connector Line (Desktop) */}
              {idx < DESMULTA_KB.metodologia.pasos.length - 1 && (
                <div className="absolute left-8 md:left-12 top-24 md:top-36 bottom-0 w-px bg-gradient-to-b from-primary/30 to-transparent hidden md:block" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-32 glass bg-primary/5 border-primary/20 p-12 rounded-[3.5rem] text-center space-y-8 shadow-2xl overflow-hidden relative group">
          <div className="absolute -inset-24 bg-primary/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-primary/20 transition-all duration-1000" />
          <h3 className="text-3xl font-black text-foreground relative z-10">
            Compromiso Tecnológico
          </h3>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium relative z-10">
            {DESMULTA_KB.metodologia.tiempos}
          </p>
          <div className="relative z-10">
            <Button
              asChild
              size="lg"
              className="h-16 px-12 bg-primary text-primary-foreground font-black rounded-2xl shadow-xl active:scale-95 transition-all"
            >
              <Link href="/">Volver al Inicio</Link>
            </Button>
          </div>
        </div>
      </main>

      <footer className="py-20 text-center opacity-40">
        <p className="text-[10px] font-black uppercase tracking-[0.3em]">
          Eficiencia Basada en Datos • Desmulta v3.6.0
        </p>
      </footer>
    </div>
  );
}
