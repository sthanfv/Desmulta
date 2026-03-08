'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, FileText, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TerminosPage() {
  const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || 'Desmulta';

  return (
    <div className="min-h-screen bg-background relative overflow-hidden text-foreground/80 font-sans selection:bg-primary/30">
      {/* Background radial gradients for consistency */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(255,191,0,0.05)_0%,transparent_40%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_90%_90%,rgba(255,191,0,0.03)_0%,transparent_40%)] pointer-events-none" />

      {/* Header Glassmorphic */}
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
              {brandName}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-36 pb-24">
        <div className="mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-5xl md:text-7xl font-black mb-6 text-foreground tracking-tight leading-[0.95]">
            Términos & <br />
            <span className="text-primary italic underline decoration-primary/20 underline-offset-8">
              Condiciones
            </span>
          </h1>
          <p className="text-xl text-muted-foreground font-medium max-w-2xl">
            Transparencia total en el manejo de sus datos y la gestión de sus trámites
            administrativos.
          </p>
        </div>

        <div className="space-y-12">
          {/* Términos de Servicio */}
          <section className="floating-card bg-card/40 backdrop-blur-sm border border-white/10 p-10 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 shadow-inner">
                <FileText className="text-primary" size={28} />
              </div>
              <h2 className="text-3xl font-black text-foreground tracking-tight">
                Condiciones del Servicio
              </h2>
            </div>

            <div className="grid gap-8 text-muted-foreground leading-relaxed text-lg">
              <div className="space-y-3">
                <h4 className="font-black text-foreground uppercase tracking-widest text-xs opacity-60">
                  1.1. Naturaleza
                </h4>
                <p>
                  {brandName} actúa como un facilitador y gestor administrativo para la debida
                  diligencia de procesos ante organismos de tránsito. No somos una entidad estatal
                  ni un despacho judicial.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-black text-foreground uppercase tracking-widest text-xs opacity-60">
                  1.2. Gratuidad del Estudio
                </h4>
                <p>
                  El análisis inicial a través del SIMIT es gratuito y de carácter informativo. No
                  obliga a la contratación de gestión posterior.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-black text-foreground uppercase tracking-widest text-xs opacity-60">
                  1.3. ESTRUCTURA DE HONORARIOS Y FASES DE GESTIÓN
                </h4>
                <div className="space-y-4">
                  <p>
                    La ejecución de trámites conlleva honorarios administrativos informados de
                    manera transparente tras el diagnóstico gratuito inicial. Para la seguridad de
                    ambas partes, los costos de la gestión técnica ante las autoridades competentes
                    se dividen en tres fases:
                  </p>
                  <ul className="list-none space-y-3 pl-0">
                    <li className="flex gap-2">
                      <span className="text-primary font-black shrink-0">Fase 1 - Apertura:</span>
                      <span>
                        Anticipo inicial que cubre los costos operativos y la estructuración del
                        expediente del caso.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary font-black shrink-0">Fase 2 - Gestión:</span>
                      <span>
                        Interposición formal y seguimiento riguroso del proceso ante los organismos
                        de tránsito.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary font-black shrink-0">Fase 3 - Éxito:</span>
                      <span>
                        Honorarios finales aplicables únicamente tras la confirmación oficial del
                        saneamiento vial.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-black text-foreground uppercase tracking-widest text-xs opacity-60">
                  1.4. POLÍTICA DE DESISTIMIENTO Y DEVOLUCIONES
                </h4>
                <p>
                  Si el usuario decide desistir del servicio durante la ejecución de la Fase 1, se
                  realizará el reintegro de su dinero, descontando únicamente un (30%) por concepto
                  de gastos administrativos, uso de plataforma y tiempo de análisis preliminar. Una
                  vez iniciada la Fase 2 (Gestión Documental), los valores abonados no son
                  reembolsables, dado que el trabajo técnico-administrativo ya se encuentra en
                  ejecución.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-black text-foreground uppercase tracking-widest text-xs opacity-60">
                  1.5. Garantías
                </h4>
                <p>
                  Contamos con alta efectividad normativa, pero las decisiones finales dependen de
                  los organismos de tránsito. Cada caso es único y se trata con rigor técnico.
                </p>
              </div>
            </div>
          </section>

          {/* Política de Privacidad */}
          <section className="floating-card bg-card/40 backdrop-blur-sm border border-white/10 p-10 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 shadow-inner">
                <Lock className="text-primary" size={28} />
              </div>
              <h2 className="text-3xl font-black text-foreground tracking-tight">
                Privacidad de Datos
              </h2>
            </div>

            <div className="grid gap-8 text-muted-foreground leading-relaxed text-lg">
              <div className="space-y-3">
                <h4 className="font-black text-foreground uppercase tracking-widest text-xs opacity-60">
                  2.1. Autorización
                </h4>
                <p>
                  Al enviar su consulta, autoriza a {brandName} a verificar su estado en el SIMIT y
                  bases de datos públicas de tránsito para fines de asesoría.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-black text-foreground uppercase tracking-widest text-xs opacity-60">
                  2.2. Uso Específico
                </h4>
                <ul className="list-disc pl-6 space-y-3">
                  <li>Consulta de deudas y comparendos vigentes.</li>
                  <li>
                    Contacto por <span className="text-primary font-bold">WhatsApp</span> para
                    entrega de resultados.
                  </li>
                  <li>Gestión de procesos de saneamiento administrativo.</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-black text-foreground uppercase tracking-widest text-xs opacity-60">
                  2.3. PROTECCIÓN Y ALMACENAMIENTO SEGURO
                </h4>
                <p>
                  No comercializamos ni compartimos sus datos con terceros. Toda la información
                  sensible suministrada se procesa bajo estrictas políticas de privacidad y se
                  almacena en servidores seguros en la nube respaldados por infraestructura
                  tecnológica de primer nivel, utilizando encriptación de grado industrial. Su
                  información se maneja bajo estrictos estándares de confidencialidad y se elimina
                  permanentemente de nuestros sistemas tras el fin de la gestión, si el usuario así
                  lo requiere.
                </p>
              </div>
            </div>
          </section>

          {/* Accept Card */}
          <div className="relative group animate-in zoom-in-95 duration-700 delay-300">
            <div className="absolute inset-0 bg-primary/10 rounded-[3rem] blur-2xl opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="relative bg-primary text-primary-foreground p-12 rounded-[3rem] text-center space-y-8 overflow-hidden">
              <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-white/10 rounded-full blur-[80px] pointer-events-none" />
              <h3 className="text-3xl font-black tracking-tight relative z-10">
                Compromiso de Confianza
              </h3>
              <p className="text-lg opacity-90 font-medium max-w-xl mx-auto relative z-10">
                Saneamiento vial profesional y eficiente. Al utilizar nuestros servicios, acepta
                estas condiciones diseñadas para su protección.
              </p>
              <div className="relative z-10">
                <Link href="/">
                  <Button className="h-16 px-12 bg-foreground text-background hover:bg-foreground/90 font-black rounded-2xl active:scale-95 transition-all text-lg shadow-xl border-none">
                    ACEPTAR Y VOLVER
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-20 text-center opacity-40">
        <p className="text-[10px] font-black uppercase tracking-[0.3em]">
          Ley 1581 de 2012 • Protección de Datos Personales
        </p>
      </footer>
    </div>
  );
}
