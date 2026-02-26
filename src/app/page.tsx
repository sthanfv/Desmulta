'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { SuccessStories } from '@/components/sections/SuccessStories';
import {
  ShieldCheck,
  ArrowRightLeft,
  CheckCircle2,
  Info,
  MessageCircle,
  Mail,
  Phone,
  MapPin,
  Instagram,
  Facebook,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConsultationForm } from '@/components/vial-clear/ConsultationForm';
import { SavingsCounter } from '@/components/interactive/SavingsCounter';
import { Lightbox } from '@/components/ui/lightbox';
import { Skeleton } from '@/components/ui/skeleton';
import { MeshBackground } from '@/components/ui/MeshBackground';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ModeToggle } from '@/components/mode-toggle';
import { doc } from 'firebase/firestore';
import {
  initiateAnonymousSignIn,
  useAuth,
  useFirestore,
  useDoc,
  useMemoFirebase,
} from '@/firebase';
import { useToast } from '@/hooks/use-toast';

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

export default function VialClearPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const auth = useAuth();
  const { toast } = useToast();
  const [isWhatsAppWarningOpen, setIsWhatsAppWarningOpen] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (auth) {
      initiateAnonymousSignIn(auth);
    }

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
    // Escuchar evento para abrir modal desde SuccessStories - MANDATO-FILTRO
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

  const firestore = useFirestore();
  const showcaseRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'site_config', 'showcase') : null),
    [firestore]
  );
  const footerRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'site_config', 'footer') : null),
    [firestore]
  );

  const { data: showcaseData } = useDoc<{
    beforeImageUrl: string;
    afterImageUrl: string;
    counterValue: string;
    counterLabel: string;
  }>(showcaseRef);

  const { data: footerData } = useDoc<{
    whatsapp: string;
    email: string;
    address: string;
    instagramUrl: string;
    facebookUrl: string;
  }>(footerRef);

  return (
    <div className="min-h-screen bg-background selection:bg-primary/30 selection:text-primary-foreground overflow-x-hidden">
      {/* Premium iOS 17 Mesh Background */}
      <MeshBackground />

      {/* Reading Progress Bar */}
      <div
        className="fixed top-0 left-0 h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50 z-[100] transition-all duration-300 ease-out"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* Header with Glassmorphism */}
      <header className="fixed top-0 left-0 right-0 z-50 px-4 py-8 pointer-events-none">
        <div className="max-w-6xl mx-auto glass rounded-full px-6 py-4 flex justify-between items-center shadow-2xl border-white/5 pointer-events-auto">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-2 rounded-xl shadow-lg shadow-primary/20">
              <ShieldCheck className="w-6 h-6 text-primary-foreground" />
            </div>
            <span
              className="text-xl font-black tracking-tight text-foreground hidden sm:inline-block"
              role="text"
            >
              DES<span className="text-primary italic">MULTA</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <ModeToggle />
            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-full px-8 active:scale-95 transition-all shadow-lg shadow-primary/20 border-none animate-shimmer"
              aria-label="Abrir formulario de consulta de multas"
            >
              Consultar Ahora
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section - Elite Authority Style */}
      <section className="min-h-[90vh] flex items-center pt-32 pb-20 px-4 relative overflow-hidden">
        {/* Background Video - Hidden on mobile for performance */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="hidden md:block w-full h-full">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover scale-110 blur-[2px] opacity-40"
            >
              <source
                src="https://assets.mixkit.co/videos/preview/mixkit-night-city-traffic-with-car-headlights-27928-large.mp4"
                type="video/mp4"
              />
            </video>
          </div>
          {/* Fallback Image for Mobile - Optimized with Next/Image */}
          <div className="md:hidden absolute inset-0 opacity-30 blur-[1px]">
            <Image
              src="https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=80&w=800"
              alt="Contexto Vial Desmulta"
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </div>
          <div className="absolute inset-0 hero-video-overlay z-10" />
        </div>

        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-20 items-center relative z-20 w-full">
          <div className="space-y-10 z-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-bold border border-primary/20 animate-in fade-in slide-in-from-left-4 duration-700">
              <ShieldCheck size={16} />
              <span>Trámite Administrativo Seguro</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tighter leading-[0.9] reveal">
              RECUPERE <br />
              <span className="text-primary italic underline decoration-primary/20 underline-offset-8 transition-all hover:decoration-primary/50">
                Liderazgo
              </span>{' '}
              VIAL
            </h1>
            <p className="text-sm md:text-lg lg:text-xl text-white/70 font-medium leading-[1.6] max-w-lg reveal reveal-delay-1">
              Blindaje legal experto para sus trámites administrativos, fotomultas y comparendos.
              Saneamiento integral con absoluta reserva y transparencia corporativa.
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
            {/* Savings Counter - MANDATO-FILTRO */}
            <div className="pt-8">
              <SavingsCounter />
            </div>
          </div>

          <div className="relative group animate-in zoom-in-95 duration-1000 delay-200 z-10">
            <div className="absolute -inset-8 bg-primary/20 rounded-[4rem] blur-[80px] opacity-40 group-hover:opacity-60 transition-opacity duration-700 animate-slow-fade" />
            <div className="relative floating-card bg-card p-4 border border-white/10 overflow-hidden shadow-2xl glow-box">
              <Lightbox
                src="https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=80&w=1200"
                alt="Gestión de multas profesional"
                className="rounded-[3rem] object-cover aspect-[4/5] shadow-2xl"
              />
              <div className="absolute bottom-8 left-8 right-8 z-10 pointer-events-none animate-float">
                <div className="glass p-4 rounded-3xl flex items-center gap-4 border-white/20 shadow-2xl">
                  <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-black text-lg shadow-lg">
                    {showcaseData ? (
                      showcaseData.counterValue || '754+'
                    ) : (
                      <Skeleton className="w-8 h-6 bg-primary-foreground/20 rounded-lg" />
                    )}
                  </div>
                  <div>
                    <div className="font-black text-sm text-foreground">
                      {showcaseData ? (
                        showcaseData.counterLabel || 'Casos Exitosos'
                      ) : (
                        <Skeleton className="w-24 h-4 bg-foreground/10" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">
                      Este mes en toda Colombia
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Success Stories Section - MANDATO-FILTRO */}
      <SuccessStories />

      {/* Ventajas - Premium Cards */}
      <section className="py-32 px-4 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-6 mb-20">
            <h2 className="text-2xl md:text-5xl font-black text-foreground tracking-tight reveal">
              Pilares de Autoridad Legal
            </h2>
            <div className="w-24 h-2 bg-primary mx-auto rounded-full shadow-lg shadow-primary/20" />
          </div>

          <div className="grid md:grid-cols-6 gap-6">
            {/* Bento Card 1 - Normativo (Large) */}
            <div className="md:col-span-4 reveal diamond-border p-10 rounded-[2.5rem] bg-card/40 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all duration-700 group overflow-hidden relative">
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-1000" />
              <div className="relative z-10 flex flex-col md:flex-row gap-10 items-center">
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
            </div>

            {/* Bento Card 2 - Stats (Medium) */}
            <div className="md:col-span-2 reveal reveal-delay-1 diamond-border p-10 rounded-[2.5rem] bg-primary/5 border border-primary/20 flex flex-col justify-center items-center text-center group">
              <AnimatedCounter
                value={showcaseData?.counterValue || '754+'}
                label={showcaseData?.counterLabel || 'Casos Exitosos'}
              />
            </div>

            {/* Bento Card 3 - Especializada (Tall) */}
            <div className="md:col-span-3 reveal reveal-delay-2 diamond-border p-10 rounded-[2.5rem] bg-card/40 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all duration-700 group">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                <ArrowRightLeft className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-foreground mb-4">Gestión Especializada</h3>
              <p className="text-muted-foreground leading-relaxed text-lg">
                Trato directo y profesional centrado en la resolución administrativa personalizada
                de su historial vial.
              </p>
            </div>

            {/* Bento Card 4 - Eficiencia (Small) */}
            <div className="md:col-span-3 reveal reveal-delay-3 diamond-border p-10 rounded-[2.5rem] bg-card/40 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all duration-700 group">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-foreground mb-4">Eficiencia Comprobada</h3>
              <p className="text-muted-foreground leading-relaxed text-lg">
                Acompañamiento experto fundamentado en el estricto cumplimiento de los términos
                legales y la normativa vigente.
              </p>
            </div>
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
                  <h2 className="text-2xl md:text-4xl font-black text-foreground leading-tight reveal">
                    Proceso Ágil <br /> & Transparente
                  </h2>
                  <p className="text-base md:text-lg text-muted-foreground reveal reveal-delay-1">
                    Tres pasos para recuperar su historial crediticio y vial.
                  </p>
                </div>

                <div className="grid gap-6">
                  {[
                    {
                      num: '01',
                      title: 'Certificación de Viabilidad',
                      desc: 'Realizamos un análisis técnico profundo de su historial para determinar las probabilidades de éxito jurídico.',
                      icon: <ShieldCheck className="w-6 h-6" />,
                    },
                    {
                      num: '02',
                      title: 'Blindaje Administrativo',
                      desc: 'Desplegamos protocolos de defensa legal especializados para fundamentar la corrección de su estado vial.',
                      icon: <ArrowRightLeft className="w-6 h-6" />,
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
                        'group relative p-8 rounded-[2rem] bg-card/40 backdrop-blur-sm border border-white/5 hover:border-primary/50 transition-all duration-500 reveal diamond-border',
                        i === 0 ? 'reveal-delay-1' : i === 1 ? 'reveal-delay-2' : 'reveal-delay-3'
                      )}
                    >
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

                      {/* Connection Line (Visual Only) */}
                      {i < 2 && (
                        <div className="absolute left-7 -bottom-6 w-px h-6 bg-gradient-to-b from-primary/50 to-transparent hidden lg:block" />
                      )}
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

            {/* Disclaimer Box - Restored */}
            <div className="mt-20 glass bg-primary/5 border-primary/20 p-8 md:p-10 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-6 shadow-xl">
              <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
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

      {/* Results - Floating Device Look */}
      <section className="py-32 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-16">
          <div className="space-y-4">
            <h2 className="text-2xl md:text-4xl font-black text-foreground tracking-tight">
              Casos de Éxito
            </h2>
            <div className="flex flex-col items-center gap-2">
              <div className="text-3xl md:text-6xl font-black text-primary tracking-tighter">
                {showcaseData ? (
                  showcaseData.counterValue || '500+'
                ) : (
                  <Skeleton className="w-40 h-16 bg-primary/20 mx-auto" />
                )}
              </div>
              <div className="text-sm md:text-base font-black uppercase tracking-[0.3em] text-muted-foreground opacity-60">
                {showcaseData ? (
                  showcaseData.counterLabel || 'Sanciones Eliminadas'
                ) : (
                  <Skeleton className="w-32 h-4 bg-muted-foreground/10 mx-auto mt-2" />
                )}
              </div>
            </div>
            <p className="text-xl text-muted-foreground">
              Resultados reales verificados ante los organismos de tránsito
            </p>
          </div>

          {showcaseData?.beforeImageUrl && showcaseData?.afterImageUrl ? (
            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* Image Before */}
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

              {/* Image After */}
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

      {/* FAQ - Premium Accordion Section */}
      <section className="py-24 px-4 bg-muted/10">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-4 mb-20 reveal">
            <h2 className="text-3xl md:text-5xl font-black text-foreground tracking-tight">
              Preguntas Frecuentes
            </h2>
            <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
              Claridad legal para su total confianza.
            </p>
          </div>

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
        </div>
      </section>

      {/* CTA Pro - Fluid Gradient */}
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
                onClick={() => setIsModalOpen(true)}
                size="lg"
                className="h-16 md:h-20 px-10 md:px-16 bg-foreground text-background hover:bg-foreground/90 font-black rounded-[2rem] active:scale-95 transition-all text-lg md:text-xl shadow-2xl border-none"
              >
                CONSULTA GRATIS
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Professional Bento Grid */}
      <footer className="py-32 px-4 relative z-10 reveal">
        <div className="max-w-7xl mx-auto space-y-12">
          {/* Main Footer Bento */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Brand Card */}
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
              </div>

              <div className="mt-12 flex gap-4">
                {footerData?.instagramUrl && (
                  <Link
                    href={footerData.instagramUrl}
                    target="_blank"
                    className="w-12 h-12 rounded-2xl bg-card border border-white/10 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-all active:scale-95"
                  >
                    <Instagram size={24} />
                  </Link>
                )}
                {footerData?.facebookUrl && (
                  <Link
                    href={footerData.facebookUrl}
                    target="_blank"
                    className="w-12 h-12 rounded-2xl bg-card border border-white/10 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-all active:scale-95"
                  >
                    <Facebook size={24} />
                  </Link>
                )}
              </div>
            </div>

            {/* Links & Contact Bento Grid */}
            <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-6">
              {/* Navigation Card */}
              <div className="lg:col-span-3 floating-card p-10 bg-card/20 border-white/5 space-y-8">
                <h4 className="text-xs font-black uppercase tracking-[0.3em] text-foreground/40">
                  Navegación Táctica
                </h4>
                <nav className="flex flex-col gap-6">
                  {[
                    { label: 'Inicio', href: '#', action: () => window.scrollTo(0, 0) },
                    { label: 'Estudio Técnico', href: '/terminos' },
                    { label: 'Términos de Uso', href: '/terminos' },
                    { label: 'Política Privacidad', href: '/terminos' },
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

              {/* Direct Info Card */}
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
                      <Phone size={20} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-muted-foreground uppercase tracking-widest leading-none mb-1.5">
                        WhatsApp 24/7
                      </p>
                      <p className="text-xl font-bold text-foreground">+57 300 [PROTEGIDO]</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-background rounded-2xl border border-primary/20">
                      <Mail size={20} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-muted-foreground uppercase tracking-widest leading-none mb-1.5">
                        Email Corporativo
                      </p>
                      <p className="text-xl font-bold text-foreground">
                        {footerData?.email || 'contacto@desmulta.com.co'}
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
                  <ArrowRightLeft
                    size={18}
                    className="ml-3 group-hover:translate-x-1 transition-transform"
                  />
                </Button>
              </div>
            </div>
          </div>

          {/* Bottom Bar Institutional */}
          <div className="pt-10 flex flex-col md:flex-row justify-between items-center gap-8 border-t border-border/20">
            <div className="flex flex-col items-center md:items-start gap-2">
              <div className="flex items-center gap-3">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em]">
                  © {new Date().getFullYear()} DESMULTA — SERVICIO PRIVADO DE GESTIÓN VIAL
                </p>
                <span className="text-[9px] font-black uppercase tracking-widest bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20 animate-pulse-slow">
                  v2.2.0 PLATINUM
                </span>
              </div>
              <div className="flex items-center gap-4 opacity-40 hover:opacity-100 transition-opacity mt-1">
                <span className="text-[9px] font-black uppercase tracking-widest bg-muted px-2 py-0.5 rounded">
                  PROTECCIÓN DE DATOS HDS
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest bg-muted px-2 py-0.5 rounded">
                  MANDATO-FILTRO CERTIFIED
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 bg-card/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/5 shadow-inner">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-green-600 dark:text-green-400">
                  Global Systems: Operational
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Modal - Modern Glass Form */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-transparent border-none shadow-none focus-visible:outline-none">
          <div className="glass rounded-[2.5rem] md:rounded-[3.5rem] border-white/20 m-2 md:m-4 shadow-3xl bg-white/95 dark:bg-black/80 overflow-hidden">
            <div className="max-h-[85vh] overflow-y-auto custom-scrollbar p-8 md:p-12 pr-6 md:pr-10">
              <DialogHeader className="mb-10">
                <DialogTitle className="text-4xl font-black text-center text-foreground tracking-tight">
                  Estudio de Viabilidad Gratuito
                </DialogTitle>
                <p className="text-center text-lg text-muted-foreground mt-3 font-medium">
                  Recibiremos su información para un análisis técnico detallado. La respuesta será
                  enviada a su WhatsApp dentro de nuestros horarios laborales habituales.
                </p>
              </DialogHeader>
              <ConsultationForm onSuccess={() => setIsModalOpen(false)} />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Floating Action - Restored */}
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

        {/* Scroll to Top - Enhanced visibility */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className={cn(
            'bg-card/80 backdrop-blur-md hover:bg-card border border-white/10 text-foreground w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-500',
            showScrollTop
              ? 'opacity-100 translate-y-0 scale-100'
              : 'opacity-0 translate-y-10 scale-50 pointer-events-none'
          )}
          title="Volver Arriba"
        >
          <ArrowRightLeft size={20} className="rotate-90" />
        </button>
      </div>

      {/* WhatsApp Disclaimer Dialog - Restored */}
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
              <div className="space-y-4 pt-4">
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
              </div>
            </DialogHeader>
            <div className="flex flex-col gap-4 mt-10">
              <Button
                onClick={handleWhatsAppRedirect}
                className="h-16 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-white font-black text-lg active:scale-95 transition-all shadow-xl shadow-green-500/20 border-none relative overflow-hidden animate-shimmer"
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
    </div>
  );
}
