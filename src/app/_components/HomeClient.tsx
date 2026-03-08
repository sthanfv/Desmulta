'use client';

/**
 * HomeClient — Componente Interactivo de la Página Principal (Refactorizado)
 *
 * Recibe los datos de configuración (showcase y footer) ya pre-renderizados
 * por el Server Component en page.tsx usando Firebase Admin SDK + cache() de React 19.
 *
 * MANDATO-FILTRO v5.20.0: Lógica modularizada en custom hooks y componentes de sección.
 */

import React, { useState, useEffect } from 'react';
import { MeshBackground } from '@/components/ui/MeshBackground';
import { InstallPWA } from '@/components/pwa/InstallPWA';
import { SuccessStories } from '@/components/sections/SuccessStories';
import { CalculadoraPrescripcion } from '@/components/CalculadoraPrescripcion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ConsultationForm } from '@/components/vial-clear/ConsultationForm';
import { ShieldCheck, Info, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Custom Hooks
import { useScrollTop } from '@/hooks/useScrollTop';
import { useRevealObserver } from '@/hooks/useRevealObserver';
import { useClipboardProtection } from '@/hooks/useClipboardProtection';
import { useMouseFollow } from '@/hooks/useMouseFollow';
import { initiateAnonymousSignIn, useAuth } from '@/firebase';

// Secciones Modularizadas
import { Header } from '@/components/sections/Header';
import { Hero } from '@/components/sections/Hero';
import { Pillars } from '@/components/sections/Pillars';
import { Methodology } from '@/components/sections/Methodology';
import { SuccessCases } from '@/components/sections/SuccessCases';
import { FAQ } from '@/components/sections/FAQ';
import { CTA } from '@/components/sections/CTA';
import { Footer } from '@/components/sections/Footer';

import type { ShowcaseConfig, FooterConfig } from '@/lib/site-config';

interface HomeClientProps {
  showcaseData: ShowcaseConfig;
  footerData: FooterConfig;
  cityContext?: string;
}

export default function HomeClient({
  showcaseData,
  footerData,
  cityContext,
}: HomeClientProps) {
  // --- Estados de UI ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'full' | 'simit'>('full');
  const [isWhatsAppWarningOpen, setIsWhatsAppWarningOpen] = useState(false);
  const [isSimitTutorialOpen, setIsSimitTutorialOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // --- Hooks Personalizados ---
  const showScrollTop = useScrollTop(400);
  const handleMouseMove = useMouseFollow();
  useRevealObserver(0.1);
  useClipboardProtection();
  
  const auth = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (auth) {
      initiateAnonymousSignIn(auth);
    }
  }, [auth]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'consultar') {
      setIsModalOpen(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
    const handleOpenModal = () => setIsModalOpen(true);
    window.addEventListener('open-consultation-modal', handleOpenModal);
    return () => window.removeEventListener('open-consultation-modal', handleOpenModal);
  }, []);

  const handleWhatsAppRedirect = () => {
    const brandName = 'Desmulta';
    const message = encodeURIComponent(
      `Hola, vengo de la web de ${brandName}. Deseo una asesoría directa para gestionar mis multas.`
    );
    const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '573005648309';
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
    setIsWhatsAppWarningOpen(false);
  };

  return (
    <div
      className="min-h-screen bg-background selection:bg-primary/30 selection:text-primary-foreground overflow-x-hidden relative group/layout"
      onMouseMove={handleMouseMove}
    >
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-0 transition duration-300 group-hover/layout:opacity-100 hidden md:block"
        style={{
          background:
            'radial-gradient(800px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,193,7,0.03), transparent 40%)',
        }}
      />
      <MeshBackground />
      <InstallPWA />

      <Header onOpenModal={() => setIsModalOpen(true)} />

      <Hero
        cityContext={cityContext}
        showcaseData={showcaseData}
        onConsultar={() => {
          setFormMode('full');
          setIsModalOpen(true);
        }}
      />

      <SuccessStories />

      <Pillars showcaseData={showcaseData} />

      <Methodology />

      <SuccessCases showcaseData={showcaseData} />

      <section className="py-24 px-4 relative overflow-hidden bg-muted/10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black text-foreground tracking-tight reveal">
              ¿Tu Multa es <span className="text-primary italic">Prescribible?</span>
            </h2>
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto reveal reveal-delay-1">
              No todas las multas se deben pagar. Usa nuestro motor matemático para saber si por ley
              puedes solicitar la exoneración total de tu deuda.
            </p>
          </div>
          <CalculadoraPrescripcion />
        </div>
      </section>

      <FAQ mounted={mounted} />

      <CTA
        onConsultar={() => {
          setFormMode('full');
          setIsModalOpen(true);
        }}
        onOpenSimitTutorial={() => setIsSimitTutorialOpen(true)}
      />

      <Footer
        footerData={footerData}
        onOpenWhatsAppWarning={() => setIsWhatsAppWarningOpen(true)}
      />

      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) setFormMode('full');
        }}
      >
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-transparent border-none shadow-none focus-visible:outline-none">
          <div className="glass rounded-[2.5rem] md:rounded-[3.5rem] border-white/20 m-2 md:m-4 shadow-3xl bg-white/95 dark:bg-black/80 overflow-hidden">
            <div className="max-h-[85vh] overflow-y-auto custom-scrollbar p-8 md:p-12 pr-6 md:pr-10">
              <DialogHeader className="mb-10">
                <DialogTitle className="text-4xl font-black text-center text-foreground tracking-tight">
                  {formMode === 'simit'
                    ? 'Envío Rápido con Captura'
                    : 'Estudio de Viabilidad Gratuito'}
                </DialogTitle>
                <DialogDescription className="text-center text-lg text-muted-foreground mt-3 font-medium">
                  {formMode === 'simit'
                    ? 'Sube tu captura del SIMIT y déjanos tu WhatsApp. Un asesor analizará tu caso y te contactará.'
                    : 'Recibiremos su información para un análisis técnico detallado. La respuesta será enviada a su WhatsApp dentro de nuestros horarios laborales habituales.'}
                </DialogDescription>
              </DialogHeader>
              <ConsultationForm onSuccess={() => setIsModalOpen(false)} mode={formMode} />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Elements (WhatsApp & ScrollTop) */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-4 group">
        <button
          onClick={() => setIsWhatsAppWarningOpen(true)}
          className="bg-[#25D366] hover:bg-[#20ba59] text-white w-20 h-20 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/30 transition-all hover:scale-110 active:scale-90"
        >
          <MessageCircle size={36} fill="currentColor" />
        </button>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className={`text-primary/70 hover:text-primary w-14 h-14 flex items-center justify-center transition-all duration-500 ${
            showScrollTop
              ? 'opacity-100 translate-y-0 scale-100'
              : 'opacity-0 translate-y-10 scale-50 pointer-events-none'
          }`}
        >
          <svg className="w-9 h-9 animate-bounce" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <Dialog open={isWhatsAppWarningOpen} onOpenChange={setIsWhatsAppWarningOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden bg-transparent border-none shadow-none focus-visible:outline-none">
          <div className="glass p-10 rounded-[3rem] border-white/20 m-4 shadow-3xl bg-white/95 dark:bg-black/80 text-center">
            <div className="w-20 h-20 bg-green-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
              <MessageCircle size={40} className="text-[#25D366]" />
            </div>
            <DialogHeader className="mb-6">
              <DialogTitle className="text-3xl font-black text-foreground tracking-tight">
                Asesoría Directa
              </DialogTitle>
              <DialogDescription className="space-y-4 pt-4">
                <p className="text-muted-foreground text-lg leading-relaxed font-medium">
                  Recuerde que el estudio de viabilidad base es{' '}
                  <span className="text-primary font-black">100% gratuito</span>.
                </p>
                <div className="bg-primary/5 border border-primary/20 p-6 rounded-2xl flex items-start gap-4 text-left">
                  <Info className="text-primary shrink-0 mt-1" size={24} />
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    El canal directo está diseñado para iniciar la{' '}
                    <strong>contratación de trámites</strong>. La gestión administrativa genera
                    honorarios por resultados.
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 mt-10">
              <Button
                onClick={handleWhatsAppRedirect}
                className="h-16 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-white font-black text-lg active:scale-95 transition-all shadow-xl shadow-green-500/20 border-none relative overflow-hidden"
              >
                ENTENDIDO, ABRIR CHAT
              </Button>
              <Button
                variant="ghost"
                onClick={() => setIsWhatsAppWarningOpen(false)}
                className="h-14 rounded-2xl text-muted-foreground font-bold hover:bg-muted active:scale-95"
              >
                Prefiero el estudio gratuito
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSimitTutorialOpen} onOpenChange={setIsSimitTutorialOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden bg-transparent border-none shadow-none focus-visible:outline-none">
          <div className="glass p-8 md:p-12 rounded-[3.5rem] border-white/20 m-4 shadow-3xl bg-white/95 dark:bg-black/90 text-center relative overflow-hidden">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <ShieldCheck size={32} className="text-primary" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-2xl md:text-3xl font-black text-foreground tracking-tight uppercase leading-none">
                Consulta tu estado <br /> <span className="text-primary italic">en 3 pasos</span>
              </DialogTitle>
              <DialogDescription className="pt-6 space-y-6 text-left">
                {[
                  { paso: 1, text: 'Accede al Portal Oficial SIMIT.' },
                  { paso: 2, text: 'Ingresa tu Cédula y consulta.' },
                  { paso: 3, text: 'Toma captura y envíanosla aquí.' },
                ].map((s) => (
                  <div key={s.paso} className="flex gap-4 items-center">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex-shrink-0 flex items-center justify-center font-black text-sm">
                      {s.paso}
                    </div>
                    <p className="text-sm font-bold text-foreground uppercase tracking-wider">{s.text}</p>
                  </div>
                ))}
                <div className="pt-4">
                  <Button
                    onClick={() => {
                      setIsSimitTutorialOpen(false);
                      setFormMode('simit');
                      setIsModalOpen(true);
                    }}
                    className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-black"
                  >
                    SUBIR CAPTURA AHORA
                  </Button>
                </div>
              </DialogDescription>
            </DialogHeader>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
