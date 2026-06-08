'use client';

/**
 * HomeClient — Componente Interactivo de la Página Principal (Refactorizado)
 *
 * Recibe los datos de configuración (showcase y footer) ya pre-renderizados
 * por el Server Component en page.tsx usando Firebase Admin SDK + cache() de React 19.
 *
 * MANDATO-FILTRO v7.7.3:
 * - Lógica modularizada en custom hooks y componentes de sección.
 * - Todos los imports dinámicos declarados DESPUÉS de `import dynamic`.
 * - MeshBackground diferido para no bloquear el First Contentful Paint.
 * - TouchDebugger desactivado en producción (Zero-PII).
 */

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { InstallPWA } from '@/components/pwa/InstallPWA';

// ─── Lazy Load: MeshBackground usa framer-motion (useReducedMotion).
// Diferirlo evita que bloquee el FCP en la ruta crítica de renderizado.
const MeshBackground = dynamic(
  () => import('@/components/ui/MeshBackground').then((m) => m.MeshBackground),
  { ssr: false, loading: () => <div className="fixed inset-0 -z-20 bg-background" /> }
);



// ─── Lazy Load: ConsultationForm arrastra Tesseract.js (~20 MB) y el motor OCR.
// Solo se carga cuando el usuario abre el modal → FCP mínimo garantizado.
const ConsultationForm = dynamic(
  () => import('@/components/vial-clear/ConsultationForm').then((mod) => mod.ConsultationForm),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center p-8 min-h-[400px] space-y-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20" />
        <div className="h-4 w-48 bg-muted/40 rounded-full" />
        <div className="h-3 w-64 bg-muted/30 rounded-full" />
        <div className="space-y-3 w-full max-w-sm">
          <div className="h-14 bg-muted/20 rounded-2xl" />
          <div className="h-14 bg-muted/20 rounded-2xl" />
          <div className="h-14 bg-primary/10 rounded-2xl" />
        </div>
      </div>
    ),
  }
);

// ─── Lazy Load: PreQualifyWidget
const PreQualifyWidget = dynamic(
  () => import('@/components/forms/PreQualifyWidget').then((mod) => mod.PreQualifyWidget),
  { ssr: false }
);

// ─── Herramienta de diagnóstico táctil y OCR.
// MANDATO-FILTRO v7.7.3: NUNCA activo en producción por exposición PII.
const TouchDebugger = dynamic(
  () => import('@/components/dev/TouchDebugger').then((mod) => mod.TouchDebugger),
  { ssr: false }
);

import { ShieldCheck, Info, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ResponsiveModal } from '@/components/ui/responsive-modal';

// Custom Hooks
import { useScrollTop } from '@/hooks/useScrollTop';
import { useRevealObserver } from '@/hooks/useRevealObserver';
import { useClipboardProtection } from '@/hooks/useClipboardProtection';
import { useMouseFollow } from '@/hooks/useMouseFollow';
import { initiateAnonymousSignIn, useAuth } from '@/firebase';

// Secciones Modularizadas (síncronas — forman parte del SSR inicial)
import { Header } from '@/components/sections/Header';
import { Hero } from '@/components/sections/Hero';
import { Pillars } from '@/components/sections/Pillars';
import { Methodology } from '@/components/sections/Methodology';

import { SuccessCases } from '@/components/sections/SuccessCases';
import { FAQ } from '@/components/sections/FAQ';
import { CTA } from '@/components/sections/CTA';
import { Footer } from '@/components/sections/Footer';
import { BentoDesmulta } from '@/components/sections/BentoDesmulta';
import { JurisprudenciaScroll } from '@/components/sections/JurisprudenciaScroll';

import { WelcomeModal } from '@/components/vial-clear/WelcomeModal';
import { MagicRings } from '@/components/ui/magic-rings';

import type { ShowcaseConfig, FooterConfig } from '@/lib/site-config';

interface HomeClientProps {
  showcaseData: ShowcaseConfig;
  footerData: FooterConfig;
  cityContext?: string;
  nonce?: string;
}

export default function HomeClient({
  showcaseData,
  footerData,
  cityContext,
  nonce,
}: HomeClientProps) {
  // --- Estados de UI ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'full' | 'simit'>('full');
  const [isPreQualified, setIsPreQualified] = useState(false);
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
      className="min-h-screen bg-background selection:bg-primary/30 selection:text-primary-foreground overflow-x-hidden relative group/layout rounded-t-xl sm:rounded-t-[2.5rem] md:rounded-[3rem] shadow-2xl sm:border-x sm:border-t border-white/5"
      onMouseMove={handleMouseMove}
    >
      {/* Spotlight Desktop (Sigue el ratón, oculto en móvil) */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-0 transition duration-300 group-hover/layout:opacity-100 hidden md:block"
        style={{
          background:
            'radial-gradient(800px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,193,7,0.03), transparent 40%)',
        }}
      />

      {/* Spotlight Móvil: Luz arquitectónica (Voltaje aumentado al 15% para que sea visible) */}
      <div
        className="pointer-events-none fixed inset-0 z-0 block md:hidden transition-colors duration-700 
                   bg-[radial-gradient(120%_50%_at_50%_0%,rgba(0,0,0,0.08)_0%,transparent_100%)] 
                   dark:bg-[radial-gradient(120%_50%_at_50%_0%,rgba(255,193,7,0.15)_0%,transparent_100%)]"
      />

      {/* Herramienta de diagnóstico táctil y OCR */}
      <TouchDebugger />

      {/* Fondo animado diferido — no bloquea el First Contentful Paint */}
      <MeshBackground />
      <InstallPWA />

      <Header
        onOpenModal={(mode) => {
          setFormMode(mode);
          setIsModalOpen(true);
        }}
      />

      <Hero
        cityContext={cityContext}
        showcaseData={showcaseData}
        onConsultar={() => {
          setFormMode('full');
          setIsModalOpen(true);
        }}
      />

      <div>
        <Pillars showcaseData={showcaseData} />
      </div>

      <div>
        <Methodology />
      </div>

      <div className="defer-render">
        <SuccessCases showcaseData={showcaseData} />
      </div>

      <div className="defer-render">
        <BentoDesmulta />
        <JurisprudenciaScroll />
      </div>



      <div className="defer-render">
        <FAQ mounted={mounted} />
      </div>

      <div className="defer-render">
        <CTA
          onConsultar={() => {
            setFormMode('full');
            setIsModalOpen(true);
          }}
          onOpenSimitTutorial={() => setIsSimitTutorialOpen(true)}
        />
      </div>

      <div className="defer-render">
        <Footer
          footerData={footerData}
          onOpenWhatsAppWarning={() => setIsWhatsAppWarningOpen(true)}
        />
      </div>

      <ResponsiveModal
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            setFormMode('full');
            setIsPreQualified(false);
          }
        }}
        customHeader={true}
      >
        <>
          <div className="mb-8 md:mb-10 text-center">
            <h2 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
              {formMode === 'simit' ? 'Envío Rápido SIMIT' : 'Estudio de Viabilidad'}
            </h2>
            <p className="text-muted-foreground mt-2 md:mt-3 font-medium text-sm md:text-lg">
              {formMode === 'simit'
                ? 'Sube tu captura del SIMIT y déjanos tu WhatsApp.'
                : 'Recibiremos su información para un análisis técnico detallado.'}
            </p>
          </div>
          <ErrorBoundary>
            {formMode === 'full' && !isPreQualified ? (
              <PreQualifyWidget onQualify={() => setIsPreQualified(true)} />
            ) : (
              <ConsultationForm
                onSuccess={() => setIsModalOpen(false)}
                mode={formMode}
                nonce={nonce}
              />
            )}
          </ErrorBoundary>
        </>
      </ResponsiveModal>

      {/* Floating Elements (WhatsApp & ScrollTop) */}
      {/* MANDATO-FILTRO v7.4.3: safe-area-inset-bottom respeta la barra de gestos nativa de Android */}
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+2rem)] right-10 sm:right-12 z-50 flex flex-col items-end gap-4 sm:gap-5 group pointer-events-none overflow-visible">
        {/* Tooltip — En desktop apunta a la izquierda, en móvil apunta hacia arriba */}
        <div
          className="
          absolute pointer-events-none
          bg-black/80 dark:bg-black/60 backdrop-blur-xl text-white
          px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em]
          opacity-0 group-hover:opacity-100 transition-all duration-500
          border border-white/10 whitespace-nowrap shadow-2xl
          flex items-center gap-2
          bottom-full mb-3 right-0
          lg:right-full lg:mr-4 lg:top-1/2 lg:-translate-y-1/2 lg:bottom-auto lg:right-auto
          translate-y-2 group-hover:translate-y-0 lg:translate-x-4 lg:translate-y-0 lg:group-hover:translate-x-0
        "
        >
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          ¿Necesitas asesoría inmediata?
        </div>



        <button
          onClick={() => setIsWhatsAppWarningOpen(true)}
          className="pointer-events-auto bg-[#25D366] hover:bg-[#20ba59] text-white w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/30 transition-all hover:scale-110 active:scale-90 relative z-10 overflow-visible"
          aria-label="Abrir chat de WhatsApp para asesoría directa"
        >
          <MessageCircle size={36} fill="currentColor" aria-hidden="true" />
          {/* Animated Magic Rings Background */}
          {/* CORRECCIÓN: canvas 3x el tamaño del botón para que los anillos */}
          {/* nunca choquen contra el borde del quad WebGL (eliminando el corte cuadrado) */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] pointer-events-none -z-10"
          >
            <MagicRings 
              color="#25D366"
              colorTwo="#25D366"
              ringCount={2} 
              baseRadius={0.12}
              radiusStep={0.10}
              scaleRate={0.28}
              attenuation={14}
              lineThickness={1.8}
              opacity={0.85}
              fadeIn={0.3}
              fadeOut={0.55}
            />
          </div>
        </button>

        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Volver arriba"
          className={cn(
            'pointer-events-auto w-14 h-14 rounded-full flex items-center justify-center transition-all duration-700 backdrop-blur-xl border border-white/10 shadow-2xl group/scroll',
            showScrollTop
              ? 'opacity-100 translate-y-0 scale-100 bg-white/10 dark:bg-black/40 text-primary'
              : 'opacity-0 translate-y-10 scale-50 pointer-events-none'
          )}
        >
          <svg
            className="w-8 h-8 group-hover/scroll:-translate-y-1 transition-transform duration-300"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            aria-hidden="true"
          >
            <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <ResponsiveModal
        open={isWhatsAppWarningOpen}
        onOpenChange={setIsWhatsAppWarningOpen}
        title="Asesoría Directa"
        icon={
          <div className="w-16 h-16 md:w-20 md:h-20 bg-green-500/10 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
            <MessageCircle size={32} className="text-[#25D366]" />
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed font-medium text-center">
            Recuerde que el estudio de viabilidad base es{' '}
            <span className="text-primary font-black">100% gratuito</span>.
          </p>
          <div className="bg-primary/5 border border-primary/20 p-4 md:p-6 rounded-2xl flex items-start gap-4 text-left">
            <Info className="text-primary shrink-0 mt-1" size={24} />
            <p className="text-xs md:text-sm text-foreground/80 leading-relaxed">
              El canal directo está diseñado para iniciar la{' '}
              <strong>contratación de trámites</strong>. La gestión administrativa genera honorarios
              por resultados.
            </p>
          </div>

          <div className="flex flex-col gap-3 mt-8">
            <Button
              onClick={handleWhatsAppRedirect}
              className="h-14 md:h-16 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-white font-black text-base md:text-lg active:scale-95 transition-all shadow-xl shadow-green-500/20 border-none w-full"
            >
              ENTENDIDO, ABRIR CHAT
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsWhatsAppWarningOpen(false)}
              className="h-12 md:h-14 rounded-2xl text-muted-foreground font-bold hover:bg-muted active:scale-95 w-full"
            >
              Prefiero el estudio gratuito
            </Button>
          </div>
        </div>
      </ResponsiveModal>

      <ResponsiveModal
        open={isSimitTutorialOpen}
        onOpenChange={setIsSimitTutorialOpen}
        title={
          <span className="uppercase text-xl md:text-3xl leading-none block">
            Consulta tu estado <br />{' '}
            <span className="text-primary italic lowercase">en 3 pasos</span>
          </span>
        }
        icon={
          <div className="w-14 h-14 md:w-16 md:h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-2 md:mb-4">
            <ShieldCheck size={28} className="text-primary" />
          </div>
        }
      >
        <div className="space-y-6 md:space-y-8 mt-2">
          {[
            { paso: 1, text: 'Accede al Portal Oficial SIMIT.' },
            { paso: 2, text: 'Ingresa tu Cédula y consulta.' },
            { paso: 3, text: 'Toma captura y envíanosla aquí.' },
          ].map((s) => (
            <div key={s.paso} className="flex gap-4 items-center">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex-shrink-0 flex items-center justify-center font-black text-sm">
                {s.paso}
              </div>
              <p className="text-sm md:text-base font-bold text-foreground uppercase tracking-wider">
                {s.text}
              </p>
            </div>
          ))}
          <div className="pt-4">
            <Button
              onClick={() => {
                setIsSimitTutorialOpen(false);
                setFormMode('simit');
                setIsModalOpen(true);
              }}
              className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-black active:scale-95 transition-transform"
            >
              SUBIR CAPTURA AHORA
            </Button>
          </div>
        </div>
      </ResponsiveModal>

      {/* Onboarding Inicial (Se auto-gestiona con localStorage) */}
      <WelcomeModal onAcknowledge={() => {}} />
    </div>
  );
}
