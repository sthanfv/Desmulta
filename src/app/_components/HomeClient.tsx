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

import { WelcomeModal } from '@/components/vial-clear/WelcomeModal';

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
    <div className="min-h-screen bg-background selection:bg-primary/30 selection:text-primary-foreground overflow-x-hidden relative group/layout rounded-t-xl sm:rounded-t-[2.5rem] md:rounded-[3rem] shadow-2xl sm:border-x sm:border-t border-white/5">
      {/* Herramienta de diagnóstico táctil y OCR */}
      {process.env.NODE_ENV === 'development' && <TouchDebugger />}

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
        <Pillars />
      </div>

      <div className="defer-render">
        <Methodology />
      </div>

      <div className="defer-render">
        <SuccessCases showcaseData={showcaseData} />
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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
            className="drop-shadow-lg scale-110"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
          </svg>{' '}
          <span
            className="absolute inset-0 rounded-full animate-ping bg-[#25D366]/30 pointer-events-none"
            style={{ animationDuration: '3s' }}
          />
          <span
            className="absolute inset-0 rounded-full animate-ping bg-[#25D366]/20 pointer-events-none"
            style={{ animationDuration: '3s', animationDelay: '1.2s' }}
          />
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
