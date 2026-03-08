'use client';

/**
 * HomeClient — Componente Interactivo de la Página Principal
 *
 * Recibe los datos de configuración (showcase y footer) ya pre-renderizados
 * por el Server Component en page.tsx usando Firebase Admin SDK + cache() de React 19.
 *
 * MANDATO-FILTRO v5.19.0: toda la lógica de estado, efectos y formularios vive aquí.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { SuccessStories } from '@/components/sections/SuccessStories';
import {
  ShieldCheck,
  ArrowUp,
  CheckCircle2,
  Info,
  MessageCircle,
  Mail,
  MapPin,
  Instagram,
  Facebook,
  BookOpen,
  Lock,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ConsultationForm } from '@/components/vial-clear/ConsultationForm';
import { SavingsCounter } from '@/components/interactive/SavingsCounter';
import { CalculadoraPrescripcion } from '@/components/CalculadoraPrescripcion';
import { TarjetaPremium } from '@/components/ui/TarjetaPremium';
import { Lightbox } from '@/components/ui/lightbox';
import { MeshBackground } from '@/components/ui/MeshBackground';
import { InstallPWA } from '@/components/pwa/InstallPWA';
import TextType from '@/components/ui/TextType';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ModeToggle } from '@/components/mode-toggle';
import { initiateAnonymousSignIn, useAuth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { ShowcaseConfig, FooterConfig } from '@/lib/site-config';

// ─── Tipos de Props ────────────────────────────────────────────────────────────

interface HomeClientProps {
  showcaseData: ShowcaseConfig;
  footerData: FooterConfig;
  cityContext?: string;
}

// ─── Componente Auxiliar: Contador Animado ─────────────────────────────────────

const AnimatedCounter = ({
  value,
  label,
  duration = 2000,
}: {
  value: string;
  label: string;
  duration?: number;
}) => {
  const [count, setCount] = useState(0);
  const target = parseInt(value.replace(/\D/g, '')) || 0;
  const suffix = value.replace(/[0-9]/g, '');

  useEffect(() => {
    let start = 0;
    const end = target;
    if (start === end) return;

    const totalMilliseconds = duration;
    const incrementTime = totalMilliseconds / end > 10 ? totalMilliseconds / end : 10;
    const step = Math.ceil(end / (totalMilliseconds / incrementTime));

    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [target, duration]);

  return (
    <div className="flex flex-col items-center">
      <span className="text-4xl md:text-5xl font-black text-primary">
        {count.toLocaleString()}
        {suffix}
      </span>
      <span className="text-muted-foreground font-medium uppercase tracking-widest text-xs mt-2">
        {label}
      </span>
    </div>
  );
};

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function HomeClient({
  showcaseData,
  footerData,
  cityContext,
}: HomeClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'full' | 'simit'>('full');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const auth = useAuth();
  const { toast } = useToast();
  const [isWhatsAppWarningOpen, setIsWhatsAppWarningOpen] = useState(false);
  const [isSimitTutorialOpen, setIsSimitTutorialOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (auth) {
      initiateAnonymousSignIn(auth);
    }
  }, [auth]);

  useEffect(() => {
    let lastScrollValue = window.scrollY;
    const handleScroll = () => {
      const currentScroll = window.scrollY;
      const threshold = 400;

      // Solo actualizar si cruzamos el umbral para evitar re-renders constantes
      if (
        (currentScroll > threshold && lastScrollValue <= threshold) ||
        (currentScroll <= threshold && lastScrollValue > threshold)
      ) {
        setShowScrollTop(currentScroll > threshold);
      }
      lastScrollValue = currentScroll;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleCopy = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().length > 10) {
        toast({
          title: 'Protección Legal Activa',
          description:
            'Contenido protegido por Desmulta Colombia ©. Su registro queda vinculado a esta consulta.',
        });
      }
    };
    document.addEventListener('copy', handleCopy);
    return () => document.removeEventListener('copy', handleCopy);
  }, [auth, toast]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

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

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (window.innerWidth < 768) return; // MANDATO-FILTRO: Optimización CPU Mobile
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    target.style.setProperty('--mouse-x', `${x}px`);
    target.style.setProperty('--mouse-y', `${y}px`);
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

      {/* Encabezado con Glassmorphism */}
      <header className="fixed top-0 left-0 right-0 z-50 px-4 py-8 pointer-events-none">
        <div className="max-w-6xl mx-auto glass rounded-full px-6 py-4 flex justify-between items-center shadow-2xl border-white/5 pointer-events-auto">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-2 rounded-xl shadow-lg shadow-primary/20">
              <ShieldCheck className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-black tracking-tight text-foreground hidden sm:inline-block">
              DES<span className="text-primary italic">MULTA</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/blog"
              className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-bold text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
            >
              <BookOpen className="w-4 h-4" />
              <span>Guía Legal</span>
            </Link>
            <ModeToggle />
            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-full px-8 active:scale-95 transition-all shadow-lg shadow-primary/20 border-none relative overflow-hidden"
              aria-label="Abrir formulario de consulta de multas"
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none shimmer-child"
              />
              Consultar Ahora
            </Button>
          </div>
        </div>
      </header>

      {/* Sección Hero */}
      <section className="min-h-[95vh] flex items-center pt-36 pb-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 z-0 overflow-hidden bg-background">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-background opacity-60 animate-pulse-slow mix-blend-screen" />
          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-background to-transparent z-10" />
          <div className="absolute inset-0 hero-video-overlay z-10" />
        </div>
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 lg:gap-24 items-center relative z-20 w-full">
          <div className="space-y-10 lg:space-y-12 z-20">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 text-primary text-sm font-bold border border-primary/20 animate-in fade-in slide-in-from-left-4 duration-700 backdrop-blur-md shadow-[0_0_30px_rgba(255,191,0,0.15)]">
              <ShieldCheck size={18} className="animate-pulse" />
              <span className="tracking-wide">Trámite Administrativo Seguro</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-[5.5rem] font-black text-white tracking-tighter leading-tight reveal uppercase drop-shadow-2xl">
              {cityContext ? (
                <>
                  MULTAS EN <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary/90 to-amber-200 italic drop-shadow-[0_0_30px_rgba(255,191,0,0.4)] pl-2 pr-5">
                    {cityContext}&nbsp;
                  </span>
                </>
              ) : (
                <>
                  RECUPERE <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary/90 to-amber-200 italic drop-shadow-[0_0_30px_rgba(255,191,0,0.4)] pl-2 pr-5">
                    Liderazgo&nbsp;
                  </span>
                  VIAL
                </>
              )}
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-white/90 font-medium leading-[1.7] max-w-lg reveal reveal-delay-1 drop-shadow-md">
              {cityContext
                ? `¿Tienes comparendos pendientes en ${cityContext}? Blindaje legal experto para sus fotomultas y trámites administrativos con el tránsito local.`
                : 'Blindaje legal experto para sus trámites administrativos, fotomultas y comparendos. Saneamiento integral con absoluta reserva y transparencia corporativa.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
              <Button
                onClick={() => {
                  setFormMode('full');
                  setIsModalOpen(true);
                }}
                size="lg"
                className="h-16 sm:h-20 px-10 sm:px-12 text-lg sm:text-xl font-black rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_20px_40px_-15px_rgba(255,191,0,0.4)] active:scale-95 transition-all border-none relative overflow-hidden group/cta"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/cta:translate-y-0 transition-transform duration-300 ease-in-out" />
                <span className="relative flex items-center gap-3">
                  INICIAR ESTUDIO SIN COSTO
                  <ArrowUp className="w-6 h-6 rotate-45 group-hover/cta:translate-x-1 group-hover/cta:-translate-y-1 transition-transform" />
                </span>
              </Button>
            </div>
            <div className="pt-10">
              <SavingsCounter />
            </div>
          </div>

          <div className="relative group animate-in zoom-in-95 duration-1000 delay-200 z-10">
            <div className="absolute -inset-8 bg-primary/20 rounded-[4rem] blur-[80px] opacity-40 group-hover:opacity-60 transition-opacity duration-700 animate-slow-fade" />
            <TarjetaPremium className="relative floating-card p-4 overflow-hidden shadow-2xl rounded-[3rem]">
              <Lightbox
                src="/hero-bg.avif"
                alt="Gestión de multas profesional - Desmulta"
                className="rounded-[3rem] object-cover aspect-[4/5] shadow-2xl"
              />
              <div className="absolute bottom-8 left-8 right-8 z-10 pointer-events-none animate-float">
                <div className="glass p-4 rounded-3xl flex items-center gap-4 border-white/20 shadow-2xl">
                  <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-black text-lg shadow-lg">
                    {showcaseData.counterValue || '754+'}
                  </div>
                  <div>
                    <div className="font-black text-sm text-foreground">
                      {showcaseData.counterLabel || 'Casos Exitosos'}
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">
                      Este mes en toda Colombia
                    </p>
                  </div>
                </div>
              </div>
            </TarjetaPremium>
          </div>
        </div>
      </section>

      {/* Sección Historias de Éxito */}
      <SuccessStories />

      {/* Pilares de Autoridad Legal / Servicios */}
      <section id="servicios" className="py-32 px-4 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-6 mb-20">
            <h2 className="text-2xl md:text-5xl font-black text-foreground tracking-tight reveal">
              Pilares de Autoridad Legal
            </h2>
            <div className="w-24 h-2 bg-primary mx-auto rounded-full shadow-lg shadow-primary/20" />
          </div>
          <div className="grid md:grid-cols-6 gap-6">
            <TarjetaPremium className="md:col-span-4 reveal p-10 rounded-[2.5rem] backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-700 group flex items-center">
              <div className="relative z-10 flex flex-col md:flex-row gap-10 items-center w-full">
                <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 shadow-inner">
                  <ShieldCheck className="w-12 h-12" />
                </div>
                <div className="space-y-4 text-center md:text-left">
                  <h3 className="text-2xl md:text-3xl font-black text-foreground">
                    Respaldo Normativo
                  </h3>
                  <p className="text-muted-foreground leading-relaxed text-lg md:text-xl max-w-xl">
                    Operamos bajo estrictos protocolos de defensa administrativa. Nuestro
                    conocimiento especializado es su mayor garantía frente a las autoridades de
                    tránsito.
                  </p>
                </div>
              </div>
            </TarjetaPremium>
            <div className="md:col-span-2 reveal reveal-delay-1 flex flex-col justify-center items-center text-center group">
              <TarjetaPremium className="p-10 w-full h-full flex flex-col justify-center items-center bg-primary/5 border-primary/20">
                <AnimatedCounter
                  value={showcaseData.counterValue || '754+'}
                  label={showcaseData.counterLabel || 'Casos Exitosos'}
                />
              </TarjetaPremium>
            </div>
            <div className="md:col-span-3 reveal reveal-delay-2 group">
              <TarjetaPremium className="p-10 h-full backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-700">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-foreground mb-4">Gestión Especializada</h3>
                <p className="text-muted-foreground leading-relaxed text-lg">
                  Trato directo y profesional centrado en la resolución administrativa personalizada
                  de su historial vial.
                </p>
              </TarjetaPremium>
            </div>
            <div className="md:col-span-3 reveal reveal-delay-3 group">
              <TarjetaPremium className="p-10 h-full backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-700">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-foreground mb-4">Eficiencia Comprobada</h3>
                <p className="text-muted-foreground leading-relaxed text-lg">
                  Acompañamiento experto fundamentado en el estricto cumplimiento de los términos
                  legales y la normativa vigente.
                </p>
              </TarjetaPremium>
            </div>
          </div>
        </div>
      </section>

      {/* Proceso / Metodología */}
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
                  {/* Tarjetas de Proceso con TarjetaPremium */}
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

      {/* Casos de Éxito */}
      <section className="py-32 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-16">
          <div className="space-y-4">
            <h2 className="text-2xl md:text-4xl font-black text-foreground tracking-tight">
              Casos de Éxito
            </h2>
            <div className="flex flex-col items-center gap-2">
              <div className="text-3xl md:text-6xl font-black text-primary tracking-tighter">
                {showcaseData.counterValue || '500+'}
              </div>
              <div className="text-sm md:text-base font-black uppercase tracking-[0.3em] text-muted-foreground opacity-60">
                {showcaseData.counterLabel || 'Sanciones Eliminadas'}
              </div>
            </div>
            <p className="text-xl text-muted-foreground">
              Resultados reales verificados ante los organismos de tránsito
            </p>
          </div>
          {showcaseData.beforeImageUrl && showcaseData.afterImageUrl ? (
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <span className="text-sm font-black uppercase tracking-widest text-primary/60">
                  Estado Anterior (Antes)
                </span>
                <div className="relative group p-2 rounded-[2.5rem] bg-gradient-to-br from-destructive/20 to-transparent shadow-Inner">
                  <div className="floating-card bg-card border border-white/10 overflow-hidden p-0 shadow-2xl">
                    <Lightbox
                      src={showcaseData.beforeImageUrl}
                      alt="Evidencia antes del proceso"
                      className="aspect-[4/3] rounded-[2.5rem]"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <span className="text-sm font-black uppercase tracking-widest text-green-500/60">
                  Resultado Final (Después)
                </span>
                <div className="relative group p-2 rounded-[2.5rem] bg-gradient-to-br from-green-500/20 to-transparent shadow-Inner">
                  <div className="floating-card bg-card border border-white/10 overflow-hidden p-0 shadow-2xl">
                    <Lightbox
                      src={showcaseData.afterImageUrl}
                      alt="Evidencia después del proceso"
                      className="aspect-[4/3] rounded-[2.5rem]"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative group p-4 rounded-[4rem] bg-gradient-to-br from-primary/30 via-primary/5 to-transparent shadow-Inner opacity-50">
              <div className="floating-card bg-card/80 backdrop-blur-md overflow-hidden p-3 shadow-2xl border-white/10">
                <div className="aspect-[16/9] md:aspect-[21/9] relative rounded-[3rem] overflow-hidden flex items-center justify-center bg-muted/20">
                  <p className="font-bold text-muted-foreground p-12">
                    Nuevos casos de éxito se están procesando...
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Motor de Prescripción (Calculadora) */}
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

      {/* FAQ */}
      <section id="faq" className="py-24 px-4 bg-muted/10">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-4 mb-20 reveal">
            <h2 className="text-3xl md:text-5xl font-black text-foreground tracking-tight">
              Preguntas Frecuentes
            </h2>
            <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
              Claridad legal para su total confianza.
            </p>
          </div>
          {!mounted ? (
            <div className="w-full h-96 bg-card/20 animate-pulse rounded-[3rem] border border-white/10 flex items-center justify-center">
              <p className="text-muted-foreground font-medium">
                Sincronizando información legal...
              </p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full space-y-4">
              {[
                {
                  q: '¿Cómo logran el saneamiento de las multas?',
                  a: 'Utilizamos protocolos de defensa administrativa basados en el debido proceso y la normativa legal vigente para corregir irregularidades en su historial vial.',
                },
                {
                  q: '¿Cuánto tiempo demora la eliminación?',
                  a: 'La gestión suele tomar entre 15 y 30 días calendario, dependiendo de los tiempos de respuesta de cada organismo de tránsito y la complejidad del historial administrativo.',
                },
                {
                  q: '¿Garantizan que la multa será eliminada?',
                  a: 'Realizamos un estudio técnico de viabilidad previo. Si determinamos que el caso cumple con los requisitos técnicos necesarios, procedemos con la gestión garantizando un servicio de alta calidad.',
                },
                {
                  q: '¿Debo pagar por adelantado el trámite?',
                  a: 'El estudio técnico inicial es 100% gratuito. Para iniciar la gestión administrativa se establecen honorarios que se detallan de forma transparente según el éxito del proceso.',
                },
                {
                  q: '¿Qué pasa si mis comparendos son muy antiguos?',
                  a: 'Los casos con mayor tiempo de permanencia en el sistema suelen tener altas probabilidades de éxito tras nuestro análisis técnico especializado.',
                },
                {
                  q: '¿Es seguro proporcionar mi número de cédula?',
                  a: 'Es indispensable para realizar la consulta técnica en las bases de datos oficiales. No almacenamos su documento de forma permanente y cumplimos con la normativa de Protección de Datos.',
                },
                {
                  q: '¿Es segura esta página? (SSL y el candado verde)',
                  a: 'Totalmente. Operamos bajo tecnología SSL (HTTPS) de grado industrial a través de Vercel. Puedes verificarlo viendo el candado verde o gris cerrado en la barra de direcciones de tu navegador.',
                },
                {
                  q: '¿Por qué es riesgoso gestionar mis deudas de tránsito por mi cuenta?',
                  a: 'Analizamos la viabilidad técnica de tu historial bajo protocolos de alta precisión para diseñar una estrategia jurídica que busca maximizar tus probabilidades de éxito.',
                },
              ].map((faq, i) => (
                <AccordionItem
                  key={i}
                  value={`item-${i}`}
                  className="border border-border/50 bg-card/50 backdrop-blur-sm rounded-3xl px-6 py-2 shadow-sm transition-all hover:bg-card hover:border-primary/30"
                >
                  <AccordionTrigger className="text-lg font-bold text-foreground hover:text-primary hover:no-underline py-5 text-left">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-md leading-relaxed pb-6 pr-4">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </section>

      {/* CTA Pro */}
      <section className="py-32 px-4 mb-32">
        <div className="max-w-6xl mx-auto relative group">
          <div className="absolute inset-0 bg-primary/20 rounded-[4rem] blur-[100px] scale-90 group-hover:scale-100 transition-transform duration-700 animate-slow-fade" />
          <div className="relative bg-primary text-primary-foreground p-16 md:p-32 rounded-[4rem] overflow-hidden text-center space-y-10 shadow-3xl shadow-primary/20 glow-box">
            <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-white/10 rounded-full blur-[120px] pointer-events-none" />
            <h2 className="text-2xl md:text-5xl font-black tracking-tight leading-[0.9] relative z-10 selection:bg-white/20">
              Libérate hoy <br /> de las deudas.
            </h2>
            <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto font-medium relative z-10">
              No dejes que tu paz mental dependa de un comparendo injusto. Iniciemos tu defensa
              ahora.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center relative z-10">
              <Button
                onClick={() => {
                  setFormMode('full');
                  setIsModalOpen(true);
                }}
                size="lg"
                className="h-16 md:h-20 px-10 md:px-16 bg-foreground text-background hover:bg-foreground/90 font-black rounded-[2rem] active:scale-95 transition-all text-lg md:text-xl shadow-2xl border-none"
              >
                CONSULTA GRATIS
              </Button>
              <Button
                onClick={() => setIsSimitTutorialOpen(true)}
                size="lg"
                className="h-auto md:h-20 min-h-[4rem] px-8 md:px-12 bg-foreground text-background hover:bg-foreground/90 font-black rounded-[2rem] active:scale-95 transition-all text-base md:text-xl shadow-2xl border-none relative overflow-hidden group flex flex-col items-center justify-center py-3"
              >
                <span className="relative z-10 block mb-1">SIMIT</span>
                <span className="relative z-10 text-[10px] md:text-xs font-semibold opacity-90 block leading-tight text-center">
                  Entra a SIMIT oficial copiando en tu navegador:
                  <br className="md:hidden" />
                  <span className="inline-block font-mono text-background px-2 py-0.5 rounded ml-0 md:ml-1 mt-1 md:mt-0 tracking-wider">
                    <TextType
                      text={['simit.org.co', 'www.simit.org.co']}
                      typingSpeed={110}
                      pauseDuration={4000}
                      deletingSpeed={70}
                      showCursor={true}
                      cursorCharacter="_"
                      cursorClassName="opacity-70"
                    />
                  </span>
                </span>
                <div className="absolute inset-0 bg-black/5 dark:bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-32 px-4 relative z-10 reveal">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 floating-card p-10 lg:p-12 bg-card/30 flex flex-col justify-between group overflow-hidden">
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-700" />
              <div className="space-y-8 relative z-10">
                <Link href="/" className="flex items-center gap-4">
                  <div className="p-3 bg-primary rounded-2xl shadow-xl shadow-primary/20">
                    <ShieldCheck className="w-10 h-10 text-primary-foreground" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-3xl md:text-4xl font-black tracking-tighter leading-none">
                      DESMULTA
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mt-1">
                      TECNOLOGÍA VIAL
                    </span>
                  </div>
                </Link>
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-md font-medium">
                  Líderes en defensa administrativa y saneamiento vial. Transformamos problemas
                  legales en soluciones definitivas con ética y transparencia.
                </p>
                <div className="pt-4 p-4 rounded-2xl bg-primary/5 border border-primary/10">
                  <p className="text-xs text-muted-foreground leading-relaxed italic">
                    <span className="font-bold text-primary">¿Por qué usamos Vercel? </span>
                    Somos un proyecto independiente de tecnología legal (LegalTech) que busca
                    democratizar el acceso a la defensa ciudadana sin costos excesivos.
                  </p>
                </div>
              </div>
              <div className="mt-12 flex gap-4">
                {footerData.instagramUrl && (
                  <Link
                    href={footerData.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-2xl bg-card border border-white/10 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-all active:scale-95"
                  >
                    <Instagram size={24} />
                  </Link>
                )}
                {footerData.facebookUrl && (
                  <Link
                    href={footerData.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-2xl bg-card border border-white/10 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-all active:scale-95"
                  >
                    <Facebook size={24} />
                  </Link>
                )}
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-6">
              <div className="lg:col-span-3 floating-card p-10 bg-card/20 border-white/5 space-y-8">
                <h4 className="text-xs font-black uppercase tracking-[0.3em] text-foreground/40">
                  Navegación Táctica
                </h4>
                <nav className="flex flex-col gap-6">
                  {[
                    { label: 'Inicio', href: '#', action: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
                    { label: 'Servicios', href: '#servicios' },
                    { label: 'Metodología', href: '#metodologia' },
                    { label: 'Guía Legal', href: '/blog' },
                    { label: 'Preguntas Frecuentes', href: '#faq' },
                    { label: 'Términos y Condiciones', href: '/terminos' },
                  ].map((link, i) => (
                    <Link
                      key={i}
                      href={link.href}
                      onClick={link.action}
                      className="text-lg font-bold text-muted-foreground hover:text-primary flex items-center gap-3 group/link transition-colors"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/20 group-hover/link:bg-primary transition-colors" />
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </div>

              <div className="lg:col-span-4 floating-card p-10 bg-primary/5 border-primary/10 space-y-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <MessageCircle size={120} className="text-primary rotate-12" />
                </div>
                <h4 className="text-xs font-black uppercase tracking-[0.3em] text-primary/60">
                  Canales Oficiales
                </h4>
                <div className="space-y-8 relative z-10">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-background rounded-2xl border border-primary/20">
                      <Mail size={20} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-muted-foreground uppercase tracking-widest leading-none mb-1.5">
                        Email Corporativo
                      </p>
                      <p
                        className="text-lg sm:text-xl font-bold text-foreground truncate max-w-[280px] sm:max-w-full"
                        title={footerData.email}
                      >
                        {footerData.email || 'contacto@desmulta.vercel.app'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-background rounded-2xl border border-primary/20">
                      <MapPin size={20} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-muted-foreground uppercase tracking-widest leading-none mb-1.5">
                        Base de Operaciones
                      </p>
                      <p className="text-xl font-bold text-foreground">
                        Cobertura Nacional Digital
                      </p>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => setIsWhatsAppWarningOpen(true)}
                  className="w-full h-16 rounded-3xl bg-primary text-primary-foreground font-black text-lg active:scale-95 transition-all shadow-xl shadow-primary/20 border-none group/btn"
                >
                  ABRIR CANAL DIRECTO
                  <ShieldCheck
                    size={18}
                    className="ml-3 group-hover:translate-x-1 transition-transform"
                  />
                </Button>
              </div>
            </div>
          </div>

          <div className="pt-10 flex flex-col md:flex-row justify-between items-center gap-8 border-t border-border/20">
            <div className="flex flex-col items-center md:items-start gap-2">
              <div className="flex items-center gap-3">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em]">
                  © {new Date().getFullYear()} DESMULTA — SERVICIO PRIVADO DE GESTIÓN VIAL
                </p>
                <span className="text-[9px] font-black uppercase tracking-widest bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
                  v1.9.4
                </span>
              </div>
              <div className="flex items-center gap-4 opacity-40 hover:opacity-100 transition-opacity mt-1">
                <span className="text-[9px] font-black uppercase tracking-widest bg-muted/30 px-2 py-0.5 rounded border border-white/5">
                  Protección de Datos HDS
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 bg-card/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/5 shadow-inner">
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-green-600 dark:text-green-400">
                  Sistemas Globales: Operativos
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Modal Formulario */}
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

      {/* Botón flotante WhatsApp */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-4 group">
        <div className="glass px-6 py-2 rounded-full text-[11px] text-foreground font-black uppercase tracking-widest shadow-2xl animate-bounce relative hidden group-hover:block border-white/20">
          ¿Dudas? Chatea con nosotros
          <div className="absolute -bottom-1 right-8 w-3 h-3 glass rotate-45 border-none"></div>
        </div>
        <button
          onClick={() => setIsWhatsAppWarningOpen(true)}
          className="bg-[#25D366] hover:bg-[#20ba59] text-white w-20 h-20 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/30 transition-all hover:scale-110 active:scale-90"
          title="Consultar por WhatsApp"
        >
          <MessageCircle size={36} fill="currentColor" className="text-white" />
        </button>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className={cn(
            'text-primary/70 hover:text-primary w-14 h-14 flex items-center justify-center transition-all duration-500',
            showScrollTop
              ? 'opacity-100 translate-y-0 scale-100'
              : 'opacity-0 translate-y-10 scale-50 pointer-events-none'
          )}
          title="Volver Arriba"
        >
          <ArrowUp size={36} className="animate-bounce" />
        </button>
      </div>

      {/* Diálogo aviso WhatsApp */}
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
                <span
                  aria-hidden="true"
                  className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none shimmer-child"
                />
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

      {/* Diálogo Tutorial SIMIT */}
      <Dialog open={isSimitTutorialOpen} onOpenChange={setIsSimitTutorialOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden bg-transparent border-none shadow-none focus-visible:outline-none">
          <div className="glass p-8 md:p-12 rounded-[3.5rem] border-white/20 m-4 shadow-3xl bg-white/95 dark:bg-black/90 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-16 -mt-16" />
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <ShieldCheck size={32} className="text-primary" />
            </div>
            <DialogHeader className="mb-0">
              <DialogTitle className="text-2xl md:text-3xl font-black text-foreground tracking-tight uppercase leading-none">
                Consulta tu estado <br /> <span className="text-primary italic">en 3 pasos</span>
              </DialogTitle>
              <DialogDescription className="pt-6 space-y-6">
                <div className="space-y-6 text-left">
                  {[
                    {
                      paso: 1,
                      titulo: 'Accede al Portal Oficial',
                      contenido: (
                        <>
                          Entra a{' '}
                          <a
                            href="https://fcm.org.co/simit/#/home-public"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary font-bold underline"
                          >
                            SIMIT
                          </a>{' '}
                          desde tu navegador. Es el único portal válido.
                        </>
                      ),
                    },
                    {
                      paso: 2,
                      titulo: 'Ingresa tu Cédula',
                      contenido:
                        'Coloca tu número de cédula en el campo de búsqueda y haz clic en consultar.',
                    },
                    {
                      paso: 3,
                      titulo: 'Envía tu Captura',
                      contenido: (
                        <>
                          Toma una captura de pantalla con tus multas visibles y{' '}
                          <button
                            className="text-primary font-bold underline"
                            onClick={() => {
                              setIsSimitTutorialOpen(false);
                              setFormMode('simit');
                              setIsModalOpen(true);
                            }}
                          >
                            envíanosla aquí
                          </button>
                          . La analizamos gratis.
                        </>
                      ),
                    },
                  ].map(({ paso, titulo, contenido }) => (
                    <div key={paso} className="flex gap-4 group">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex-shrink-0 flex items-center justify-center font-black text-sm shadow-lg group-hover:scale-110 transition-transform">
                        {paso}
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-foreground uppercase tracking-wider text-xs">
                          {titulo}
                        </p>
                        <p className="text-sm text-muted-foreground leading-snug">{contenido}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </DialogDescription>
            </DialogHeader>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
