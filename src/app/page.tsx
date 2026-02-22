'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { ShieldCheck, ArrowRightLeft, CheckCircle2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConsultationForm } from '@/components/vial-clear/ConsultationForm';
import { Lightbox } from '@/components/ui/lightbox';
import { ModeToggle } from '@/components/mode-toggle';
import { initiateAnonymousSignIn, useAuth } from '@/firebase';

export default function VialClearPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const auth = useAuth();

  useEffect(() => {
    if (auth) {
      initiateAnonymousSignIn(auth);
    }
  }, [auth]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden selection:bg-primary/30">
      {/* Background radial gradient for "Monet" depth */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,191,0,0.08)_0%,transparent_50%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,191,0,0.05)_0%,transparent_50%)] pointer-events-none" />

      {/* Header with Glassmorphism */}
      <header className="fixed top-0 left-0 right-0 z-50 px-4 py-6">
        <div className="max-w-6xl mx-auto glass rounded-2xl md:rounded-full px-6 py-3 flex justify-between items-center shadow-2xl border-white/10">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-2 rounded-xl shadow-lg shadow-primary/20">
              <ShieldCheck className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-black tracking-tight text-foreground hidden sm:inline-block">
              DES<span className="text-primary italic">MULTA</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <ModeToggle />
            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-full px-8 active:scale-95 transition-all shadow-lg shadow-primary/20 border-none"
            >
              Consultar Ahora
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section - Floating Style */}
      <section className="pt-44 pb-20 px-4">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-bold border border-primary/20 animate-in fade-in slide-in-from-left-4 duration-700">
              <ShieldCheck size={16} />
              <span>Servicio 100% Legal y Seguro</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-black text-foreground tracking-tight leading-[0.95] animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
              Recuperamos tu <br />
              <span className="text-primary italic underline decoration-primary/20 underline-offset-8 transition-all hover:decoration-primary/50">
                Tranquilidad
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
              Expertos en saneamiento legal de fotomultas y comparendos. Sin procesos tediosos, solo
              resultados directos y efectivos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
              <Button
                onClick={() => setIsModalOpen(true)}
                size="lg"
                className="h-16 px-10 text-lg font-black rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xl shadow-primary/30 active:scale-95 transition-all border-none"
              >
                Iniciar Estudio Sin Costo
                <ArrowRightLeft className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="relative group animate-in zoom-in-95 duration-1000 delay-200">
            <div className="absolute -inset-8 bg-primary/20 rounded-[4rem] blur-[80px] opacity-40 group-hover:opacity-60 transition-opacity duration-700" />
            <div className="relative floating-card bg-card/50 backdrop-blur-sm p-4 border border-white/10 overflow-hidden shadow-2xl">
              <div className="aspect-[4/3] relative rounded-[2rem] overflow-hidden shadow-Inner">
                <Image
                  src="https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=80&w=1200"
                  alt="Gestión de multas profesional"
                  fill
                  className="object-cover transition-transform duration-1000 group-hover:scale-110"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-8 left-8 right-8">
                  <div className="glass p-4 rounded-3xl flex items-center gap-4 border-white/20 shadow-2xl">
                    <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-black text-lg shadow-lg">
                      1k+
                    </div>
                    <div>
                      <p className="font-black text-sm text-foreground">Sanciones Eliminadas</p>
                      <p className="text-xs text-muted-foreground font-medium">
                        Este mes en toda Colombia
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ventajas - Premium Cards */}
      <section className="py-32 px-4 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-6 mb-20">
            <h2 className="text-4xl md:text-6xl font-black text-foreground tracking-tight">
              ¿Por qué confiar en nosotros?
            </h2>
            <div className="w-24 h-2 bg-primary mx-auto rounded-full shadow-lg shadow-primary/20" />
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {[
              {
                icon: ShieldCheck,
                title: 'Legalidad Garantizada',
                desc: 'Operamos estrictamente bajo la Ley 769 de 2002 y el CPACA.',
                delay: '0',
              },
              {
                icon: ArrowRightLeft,
                title: 'Trámite Directo',
                desc: 'Sin intermediarios oscuros. Usted trata con abogados reales.',
                delay: '100',
              },
              {
                icon: CheckCircle2,
                title: 'Pago por Resultados',
                desc: 'Nuestra comisión se genera solo si el proceso es exitoso.',
                delay: '200',
              },
            ].map((item, i) => (
              <div
                key={i}
                style={{ animationDelay: `${item.delay}ms` }}
                className="group p-10 floating-card bg-card border border-border/50 hover:border-primary/50 hover:shadow-primary/5 transition-all duration-500 animate-in fade-in slide-in-from-bottom-8 fill-mode-both"
              >
                <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary mb-8 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 shadow-inner">
                  <item.icon className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-foreground mb-4">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-lg">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Proceso - Glass Layout */}
      <section className="py-32 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="glass p-12 md:p-20 rounded-[3rem] relative overflow-hidden border-white/10 shadow-3xl bg-white/5 dark:bg-white/[0.02]">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative grid lg:grid-cols-2 gap-20 items-center">
              <div className="space-y-12">
                <div className="space-y-4">
                  <h2 className="text-4xl md:text-5xl font-black text-foreground leading-tight">
                    Proceso Ágil <br /> & Transparente
                  </h2>
                  <p className="text-muted-foreground text-xl">
                    Tres pasos para recuperar tu historial crediticio y vial.
                  </p>
                </div>

                <div className="space-y-10">
                  {[
                    {
                      num: '01',
                      title: 'Auditoría Inicial',
                      desc: 'Crucemos datos con el SIMIT para ver la viabilidad inmediata.',
                    },
                    {
                      num: '02',
                      title: 'Estrategia Jurídica',
                      desc: 'Radicamos derechos de petición y recursos de ley específicos.',
                    },
                    {
                      num: '03',
                      title: 'Saneamiento Total',
                      desc: 'Verificamos la eliminación efectiva ante el tránsito.',
                    },
                  ].map((step, i) => (
                    <div key={i} className="flex gap-8 group">
                      <div className="text-5xl font-black text-primary/10 group-hover:text-primary group-hover:scale-110 transition-all duration-500 select-none">
                        {step.num}
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                          {step.title}
                        </h4>
                        <p className="text-muted-foreground text-lg leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-[3rem] blur-3xl opacity-20 -rotate-6" />
                <div className="relative aspect-square rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white/10 rotate-2 hover:rotate-0 transition-all duration-700">
                  <Image
                    src="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=800"
                    alt="Legal assistance office"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results - Floating Device Look */}
      <section className="py-32 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-16">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-6xl font-black text-foreground tracking-tight">
              Testigos del Éxito
            </h2>
            <p className="text-xl text-muted-foreground">Historias de éxito reales verificadas</p>
          </div>

          <div className="relative group p-4 rounded-[4rem] bg-gradient-to-br from-primary/30 via-primary/5 to-transparent shadow-Inner">
            <div className="floating-card bg-card/80 backdrop-blur-md overflow-hidden p-3 shadow-2xl border-white/10">
              <div className="aspect-[16/9] md:aspect-[21/9] relative rounded-[3rem] overflow-hidden group">
                <Image
                  src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80&w=1200"
                  alt="Caso ganado exitosamente"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <Lightbox
                    src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80&w=1200"
                    alt="Evidencia proceso ganado"
                    className="scale-125"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ - Glass Accordion Look */}
      <section className="py-32 px-4">
        <div className="max-w-3xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-black text-foreground uppercase tracking-[0.2em]">FAQ</h2>
            <p className="text-muted-foreground text-lg">Resolviendo tus inquietudes</p>
          </div>

          <div className="space-y-6">
            {[
              {
                q: '¿Es realmente legal este proceso?',
                a: 'Totalmente. Utilizamos las herramientas que la misma ley de tránsito y el CPACA otorgan a los ciudadanos para defender sus derechos ante cobros irregulares.',
              },
              {
                q: '¿Cuánto tiempo demora la eliminación?',
                a: 'El proceso administrativo suele tomar entre 45 y 75 días hábiles, dependiendo de la rapidez de respuesta de la Secretaría de Tránsito correspondiente.',
              },
            ].map((faq, i) => (
              <div
                key={i}
                className="floating-card bg-card p-8 border border-white/5 hover:border-primary/30 transition-all duration-300"
              >
                <h4 className="flex items-center gap-4 text-xl font-bold text-foreground mb-4">
                  <Info className="text-primary w-6 h-6" />
                  {faq.q}
                </h4>
                <p className="text-muted-foreground text-lg leading-relaxed pl-10 border-l border-primary/20">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Pro - Fluid Gradient */}
      <section className="py-32 px-4 mb-32">
        <div className="max-w-6xl mx-auto relative group">
          <div className="absolute inset-0 bg-primary/20 rounded-[4rem] blur-[100px] scale-90 group-hover:scale-100 transition-transform duration-700" />
          <div className="relative bg-primary text-primary-foreground p-16 md:p-32 rounded-[4rem] overflow-hidden text-center space-y-10 shadow-3xl shadow-primary/20">
            <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-white/10 rounded-full blur-[120px] pointer-events-none" />
            <h2 className="text-5xl md:text-8xl font-black tracking-tight leading-[0.9] relative z-10 selection:bg-white/20">
              Libérate hoy <br /> de las deudas.
            </h2>
            <p className="text-2xl opacity-90 max-w-2xl mx-auto font-medium relative z-10">
              No dejes que tu paz mental dependa de un comparendo injusto. Iniciemos tu defensa
              ahora.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center relative z-10">
              <Button
                onClick={() => setIsModalOpen(true)}
                size="lg"
                className="h-20 px-16 bg-foreground text-background hover:bg-foreground/90 font-black rounded-[2rem] active:scale-95 transition-all text-xl shadow-2xl border-none"
              >
                CONSULTA GRATIS
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Soft & Modern */}
      <footer className="bg-card/30 backdrop-blur-md border-t border-border/50 py-20 px-4 rounded-t-[4rem]">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-20 items-center">
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <ShieldCheck className="w-10 h-10 text-primary" />
              </div>
              <span className="text-3xl font-black tracking-tighter">DESMULTA</span>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-sm">
              Somos una firma privada especializada en consultoría jurídica para conductores.
              Transformamos problemas en soluciones legales.
            </p>
          </div>
          <div className="text-sm text-muted-foreground font-medium space-y-2 md:text-right uppercase tracking-widest">
            <p>© 2026 DESMULTA COLOMBIA</p>
            <p>Justicia Vial & Transparencia</p>
          </div>
        </div>
      </footer>

      {/* Modal - Modern Glass Form */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-transparent border-none shadow-none focus-visible:outline-none">
          <div className="glass p-12 rounded-[3.5rem] border-white/20 m-4 shadow-3xl bg-white/95 dark:bg-black/80">
            <DialogHeader className="mb-10">
              <DialogTitle className="text-4xl font-black text-center text-foreground tracking-tight">
                Estudio Legal Gratuito
              </DialogTitle>
              <p className="text-center text-lg text-muted-foreground mt-3 font-medium">
                Analizaremos tu caso y te brindaremos viabilidad en minutos.
              </p>
            </DialogHeader>
            <ConsultationForm onSuccess={() => setIsModalOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
