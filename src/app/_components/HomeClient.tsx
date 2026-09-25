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
import { m } from 'framer-motion';
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
  const [geoCity, setGeoCity] = useState<string | undefined>(cityContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'full' | 'simit'>('full');
  const [isPreQualified, setIsPreQualified] = useState(false);
  const [isWhatsAppWarningOpen, setIsWhatsAppWarningOpen] = useState(false);
  const [isSimitTutorialOpen, setIsSimitTutorialOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // --- Hooks Personalizados ---
  const showScrollTop = useScrollTop(1000);
  useRevealObserver(0.1);
  useClipboardProtection();

  const auth = useAuth();

  useEffect(() => {
    setMounted(true);

    // Recuperar Geo-localización de Vercel en el cliente (Optimización Option B)
    if (cityContext === 'Colombia') {
      fetch('/api/geo')
        .then((res) => res.json())
        .then((data) => {
          if (data?.city) {
            setGeoCity(data.city);
          }
        })
        .catch(() => {});
    }
  }, [cityContext]);

  useEffect(() => {
    if (auth) {
      initiateAnonymousSignIn(auth);
    }
  }, [auth]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'consultar') {
      setFormMode(params.get('modo') === 'simit' ? 'simit' : 'full');
      setIsModalOpen(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
    const handleOpenModal = (e?: Event) => {
      const customEvent = e as CustomEvent<{ mode?: 'full' | 'simit' }>;
      if (customEvent?.detail?.mode === 'simit') {
        setFormMode('simit');
      } else {
        setFormMode('full');
      }
      setIsModalOpen(true);
    };
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
    <div className="min-h-screen bg-background selection:bg-primary/30 selection:text-primary-foreground relative group/layout">
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
        cityContext={geoCity}
        showcaseData={showcaseData}
        onConsultar={() => {
          setFormMode('full');
          setIsModalOpen(true);
        }}
      />

      <div>
        <Pillars />
      </div>

      <div>
        <Methodology />
      </div>

      <div>
        <SuccessCases showcaseData={showcaseData} />
      </div>

      <div>
        <FAQ mounted={mounted} />
      </div>

      <div>
        <CTA
          onConsultar={() => {
            setFormMode('full');
            setIsModalOpen(true);
          }}
          onOpenSimitTutorial={() => setIsSimitTutorialOpen(true)}
        />
      </div>

      <div>
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
        <div className="relative z-10">
          {/* Glowing orbs optimizados con radial-gradient en lugar de blur para rendimiento móvil */}
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 to-transparent rounded-full -z-10 pointer-events-none" />
          <div className="absolute top-40 -right-40 w-96 h-96 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-500/10 to-transparent rounded-full -z-10 pointer-events-none" />

          <div className="mb-8 md:mb-10 text-center relative z-10">
            <h2 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
              {formMode === 'simit' ? 'Envío Rápido SIMIT' : 'Estudio de Viabilidad'}
            </h2>
            <p className="text-muted-foreground mt-2 md:mt-3 font-medium text-sm md:text-lg">
              {formMode === 'simit'
                ? 'Sube tu captura del SIMIT y déjanos tu WhatsApp.'
                : 'Recibiremos su información para un análisis técnico detallado.'}
            </p>
          </div>
          <div className="relative z-10">
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
          </div>
        </div>
      </ResponsiveModal>

      {/* Botón "Volver arriba" (solo escritorio). [2026-09-24] Se quitó el botón verde de WhatsApp
          con animación permanente: tres botones flotantes competían entre sí y tapaban contenido.
          La ayuda (asistente + WhatsApp) vive en un solo lanzador abajo a la derecha
          (ChatAssistantWidget); este botón queda encima de él, pequeño y solo tras hacer scroll. */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Volver arriba"
        className={cn(
          'fixed right-6 bottom-[calc(env(safe-area-inset-bottom,0px)+6.5rem)] z-50 hidden md:flex w-11 h-11 rounded-full items-center justify-center bg-background text-foreground border border-border shadow-lg transition-all duration-300 hover:-translate-y-0.5',
          showScrollTop
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-4 pointer-events-none'
        )}
      >
        <svg
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden="true"
        >
          <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <ResponsiveModal
        open={isWhatsAppWarningOpen}
        onOpenChange={setIsWhatsAppWarningOpen}
        title={<span className="font-black tracking-tight text-2xl">Asesoría Directa</span>}
        icon={
          <m.div
            style={{ willChange: 'transform, opacity' }}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 15 }}
            className="relative w-20 h-20 md:w-24 md:h-24 mx-auto mb-4"
          >
            <div className="absolute inset-0 bg-[#25D366]/20 blur-2xl rounded-full animate-pulse" />
            <div className="relative w-full h-full bg-gradient-to-br from-[#25D366]/20 to-[#25D366]/5 rounded-[2.5rem] flex items-center justify-center border border-[#25D366]/30 shadow-2xl backdrop-blur-sm">
              <MessageCircle
                size={40}
                className="text-[#25D366] drop-shadow-[0_0_12px_rgba(37,211,102,0.6)]"
              />
            </div>
          </m.div>
        }
      >
        <div className="space-y-6 relative z-10 mt-2">
          {/* Fondo difuminado sutil (optimizado con gradiente radial) */}
          <div className="absolute -top-32 -right-32 w-72 h-72 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#25D366]/10 to-transparent rounded-full -z-10 pointer-events-none" />

          <m.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-base md:text-lg leading-relaxed font-medium text-center"
          >
            Recuerde que el estudio de viabilidad base es{' '}
            <span className="text-foreground font-black bg-[#25D366]/10 px-2 py-0.5 rounded-md border border-[#25D366]/20">
              100% gratuito
            </span>
            .
          </m.p>

          <m.div
            style={{ willChange: 'transform, opacity' }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-muted/40 border border-[#25D366]/20 p-5 md:p-6 rounded-3xl flex items-start gap-4 text-left shadow-inner relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#25D366]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="bg-background p-2.5 rounded-2xl shadow-sm border border-border/50 shrink-0 relative z-10">
              <Info className="text-[#25D366]" size={22} />
            </div>
            <p className="text-xs md:text-sm text-foreground/80 leading-relaxed relative z-10">
              El canal directo está diseñado para iniciar la{' '}
              <strong className="text-foreground">contratación de trámites</strong>. La gestión
              administrativa genera honorarios por resultados.
            </p>
          </m.div>

          <m.div
            style={{ willChange: 'transform, opacity' }}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col gap-3 mt-8 pt-4 border-t border-border/50"
          >
            <Button
              onClick={handleWhatsAppRedirect}
              className="h-14 md:h-16 rounded-2xl bg-gradient-to-r from-[#25D366] to-[#1ebc5c] hover:to-[#1aa852] text-white font-black text-sm md:text-base active:scale-95 transition-all shadow-[0_0_30px_rgba(37,211,102,0.25)] hover:shadow-[0_0_40px_rgba(37,211,102,0.4)] border-none w-full"
            >
              ENTENDIDO, ABRIR CHAT
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsWhatsAppWarningOpen(false)}
              className="h-12 md:h-14 rounded-2xl text-muted-foreground font-bold hover:bg-muted active:scale-95 w-full text-xs md:text-sm"
            >
              Prefiero el estudio gratuito
            </Button>
          </m.div>
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
    </div>
  );
}
