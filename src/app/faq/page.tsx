'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, HelpCircle, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { DESMULTA_KB } from '@/lib/ai/knowledge-base';

export default function FAQPage() {
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
              Ayuda
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-36 pb-24">
        <div className="mb-20 animate-in fade-in slide-in-from-bottom-4 duration-700 text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mx-auto mb-8 shadow-inner">
            <HelpCircle size={40} />
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-6 text-foreground tracking-tight leading-[0.95]">
            Preguntas <br />
            <span className="text-primary italic underline decoration-primary/20 underline-offset-8">
              Frecuentes
            </span>
          </h1>
          <p className="text-xl text-muted-foreground font-medium max-w-2xl mx-auto">
            Todo lo que necesita saber sobre el saneamiento vial y nuestros procesos
            administrativos.
          </p>
        </div>

        <div className="space-y-6">
          <Accordion type="single" collapsible className="w-full space-y-4">
            {DESMULTA_KB.faq.map((item, idx) => (
              <AccordionItem
                key={idx}
                value={`faq-${idx}`}
                className="border border-white/5 bg-card/30 backdrop-blur-sm rounded-3xl px-8 py-2 shadow-xl hover:border-primary/30 transition-all"
              >
                <AccordionTrigger className="text-xl font-black text-foreground hover:text-primary hover:no-underline py-6 text-left">
                  {item.pregunta}
                </AccordionTrigger>
                <AccordionContent className="text-lg text-muted-foreground leading-relaxed pb-8 font-medium">
                  {item.respuesta}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* CTA Card */}
        <div className="mt-20 glass p-12 rounded-[3.5rem] border-white/10 text-center space-y-8 bg-primary/5">
          <h3 className="text-3xl font-black text-foreground">¿Aún tiene dudas?</h3>
          <p className="text-xl text-muted-foreground font-medium">
            Contacto directo con nuestros asesores expertos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="h-16 px-10 bg-primary text-primary-foreground font-black rounded-2xl shadow-xl active:scale-95 transition-all"
            >
              <Link href="/">Hacer Estudio Gratis</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-16 px-10 border-white/10 glass hover:bg-white/5 font-black rounded-2xl active:scale-95 transition-all text-foreground"
            >
              <a
                href={`https://wa.me/${DESMULTA_KB.contacto.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <MessageCircle size={20} />
                Consultar WhatsApp
              </a>
            </Button>
          </div>
        </div>
      </main>

      <footer className="py-20 text-center opacity-40">
        <p className="text-[10px] font-black uppercase tracking-[0.3em]">
          Debido Proceso Administrativo • Desmulta 2026
        </p>
      </footer>
    </div>
  );
}
