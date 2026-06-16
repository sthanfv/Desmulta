'use client';

import React, { useState, useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { X, Share2, Play, Pause, Shield, Clock, FileCheck, CheckCircle2, MessageCircle } from 'lucide-react';
import { TrackingCase } from '@/lib/definitions';
import { Haptics } from '@/lib/utils/haptics';

interface StoryProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: TrackingCase;
  currentStep: number;
}

const PASOS_STORY = [
  { id: 1, name: 'Recibido', key: 'pendiente', desc: 'Tu solicitud fue recibida y está en cola de revisión por nuestro equipo legal.', icon: Clock, color: 'from-blue-500 to-cyan-500' },
  { id: 2, name: 'Contactado', key: 'contactado', desc: '¡Especialista asignado! Un asesor legal se ha puesto en contacto contigo para coordinar la defensa.', icon: MessageCircle, color: 'from-amber-500 to-orange-500' },
  { id: 3, name: 'En Estudio', key: 'estudio', desc: 'Tu caso está en análisis técnico avanzado. Estudiamos las fallas del SIMIT para impugnar.', icon: Shield, color: 'from-purple-500 to-indigo-500' },
  { id: 4, name: 'Resuelto', key: 'terminado', desc: '¡Gestión concluida con éxito! Verifica tu estado en la plataforma de tránsito.', icon: FileCheck, color: 'from-emerald-500 to-teal-500' },
];

const DURACION_PASO_MS = 4000; // 4 segundos por story

export default function StoryProgressModal({
  isOpen,
  onClose,
  caseData,
  currentStep,
}: StoryProgressModalProps) {
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showCopiedText, setShowCopiedText] = useState(false);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const startTime = useRef<number>(Date.now());
  const elapsedBeforePause = useRef<number>(0);

  // Límite de avance automático: no mostramos pasos futuros que no se han desbloqueado en el caso real
  const maxReachedStep = Math.min(4, Math.max(1, currentStep));

  // Manejar ciclo de la barra de progreso
  useEffect(() => {
    if (!isOpen) return;

    if (isPaused) {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
      elapsedBeforePause.current += Date.now() - startTime.current;
      return;
    }

    startTime.current = Date.now();
    const pasoDuration = DURACION_PASO_MS;

    progressInterval.current = setInterval(() => {
      const totalElapsed = elapsedBeforePause.current + (Date.now() - startTime.current);
      const pct = Math.min(100, (totalElapsed / pasoDuration) * 100);
      setProgress(pct);

      if (pct >= 100) {
        clearInterval(progressInterval.current!);
        progressInterval.current = null;
        elapsedBeforePause.current = 0;

        // Avanzar al siguiente paso si no hemos llegado al límite del caso actual
        setActiveStepIdx((prev) => {
          if (prev < maxReachedStep - 1) {
            setProgress(0);
            Haptics.impact();
            return prev + 1;
          } else {
            // Si llega al final de su estado actual, se queda pausado en el paso más reciente
            setIsPaused(true);
            return prev;
          }
        });
      }
    }, 30);

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [isOpen, activeStepIdx, isPaused, maxReachedStep]);

  // Reset al abrir el modal
  useEffect(() => {
    if (isOpen) {
      setActiveStepIdx(0);
      setProgress(0);
      setIsPaused(false);
      elapsedBeforePause.current = 0;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const activeStep = PASOS_STORY[activeStepIdx];
  const IconoPaso = activeStep.icon;

  // Lógica de navegación manual tocando la pantalla
  const handleScreenTouch = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const screenWidth = rect.width;

    elapsedBeforePause.current = 0;
    setProgress(0);

    if (clickX < screenWidth * 0.3) {
      // Tocar izquierda: retroceder
      setActiveStepIdx((prev) => {
        if (prev > 0) {
          setIsPaused(false);
          Haptics.impact();
          return prev - 1;
        }
        return prev;
      });
    } else {
      // Tocar derecha: avanzar (sin pasarse del límite de avance del caso)
      setActiveStepIdx((prev) => {
        if (prev < maxReachedStep - 1) {
          setIsPaused(false);
          Haptics.impact();
          return prev + 1;
        } else {
          // Vibración de tope
          Haptics.impact();
          return prev;
        }
      });
    }
  };

  // Compartir el enlace
  const handleShare = async () => {
    const shareUrl = window.location.href;
    const title = `Progreso de mi Caso - Radicado ${caseData.shortId}`;
    const text = `¡Mi trámite con Desmulta.online va en el paso: ${activeStep.name}! Escanea o entra al enlace para ver el progreso real.`;

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile && navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
        Haptics.impact();
      } catch (_e) {
        // Cancelado o fallido
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        Haptics.impact();
        setShowCopiedText(true);
        setTimeout(() => setShowCopiedText(false), 2500);
      } catch (_e) {
        // Fallback si falla el portapapeles
        alert('Enlace: ' + shareUrl);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[999999] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
      {/* Contenedor tipo móvil con Glassmorphism */}
      <div 
        className="relative aspect-[9/16] w-full max-w-sm max-h-[85vh] md:max-h-[80vh] rounded-[2.5rem] overflow-hidden bg-zinc-950 border border-white/10 shadow-[0_0_80px_rgba(212,175,55,0.15)] flex flex-col justify-between p-6 select-none"
        onPointerDown={() => setIsPaused(true)}
        onPointerUp={() => setIsPaused(false)}
      >
        {/* Luces decorativas en el fondo */}
        <div className="absolute -top-20 -left-20 w-44 h-44 bg-primary/10 rounded-full blur-[60px] pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-44 h-44 bg-amber-500/10 rounded-full blur-[60px] pointer-events-none" />

        {/* Zona superior: Barras de Progreso e info del caso */}
        <div className="relative z-10 shrink-0">
          {/* Indicadores horizontales (Stories Progress) */}
          <div className="flex gap-1.5 mb-4">
            {PASOS_STORY.map((paso, idx) => {
              let pct = 0;
              if (idx < activeStepIdx) pct = 100;
              else if (idx === activeStepIdx) pct = progress;

              // Si el paso no está desbloqueado por el caso real, se muestra atenuada
              const isLocked = paso.id > maxReachedStep;

              return (
                <div 
                  key={paso.id} 
                  className={`h-1 flex-1 rounded-full overflow-hidden transition-all duration-300 ${isLocked ? 'bg-zinc-800/40' : 'bg-zinc-800'}`}
                >
                  <div 
                    className="h-full bg-primary rounded-full" 
                    style={{ width: `${pct}%`, transition: isPaused && idx === activeStepIdx ? 'none' : 'width 30ms linear' }}
                  />
                </div>
              );
            })}
          </div>

          {/* Header de la historia */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-amber-500 flex items-center justify-center border border-white/10 shadow-inner">
                <span className="text-black font-black text-sm uppercase tracking-wider">D</span>
              </div>
              <div>
                <h3 className="text-sm font-black text-white leading-tight">Desmulta Legal</h3>
                <p className="text-[10px] font-bold text-primary tracking-wider uppercase font-mono">
                  Radicado: {caseData.shortId}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPaused(!isPaused);
                }}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center justify-center transition-colors"
                aria-label={isPaused ? "Reanudar" : "Pausar"}
              >
                {isPaused ? <Play size={14} className="fill-white" /> : <Pause size={14} />}
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="w-8 h-8 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 flex items-center justify-center transition-colors"
                aria-label="Cerrar historias"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Zona central interactiva (Pantalla táctil) */}
        <div 
          className="flex-1 w-full relative flex items-center justify-center cursor-pointer my-4"
          onClick={handleScreenTouch}
        >
          <AnimatePresence mode="wait">
            <m.div
              key={activeStepIdx}
              initial={{ opacity: 0, scale: 0.9, filter: 'blur(8px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 1.05, filter: 'blur(8px)' }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="w-full flex flex-col items-center justify-center text-center p-4 relative"
            >
              {/* Icono animado del paso actual */}
              <div className={`w-28 h-28 rounded-[2rem] bg-gradient-to-tr ${activeStep.color} flex items-center justify-center mb-6 shadow-2xl relative border border-white/10`}>
                <div className="absolute inset-0 bg-white/10 rounded-[2rem] filter blur-xl animate-pulse pointer-events-none" />
                <IconoPaso size={48} className="text-white relative z-10" />
              </div>

              {/* Titulado */}
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2">
                Paso {activeStep.id} de 4
              </span>
              <h2 className="text-3xl font-black text-white tracking-tight uppercase mb-4 px-2">
                {activeStep.name}
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed max-w-xs font-medium px-4">
                {activeStep.desc}
              </p>

              {/* Marca de agua Zero-PII */}
              <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1.5 opacity-30">
                <CheckCircle2 size={10} className="text-emerald-500" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Protección Zero-PII Activa
                </span>
              </div>
            </m.div>
          </AnimatePresence>
        </div>

        {/* Zona inferior: Botón Compartir Logro y CTA */}
        <div className="relative z-10 shrink-0 flex flex-col gap-3">
          <AnimatePresence>
            {showCopiedText && (
              <m.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-center text-[10px] font-black uppercase tracking-wider shadow-sm"
              >
                ¡Enlace copiado al portapapeles! 📋
              </m.div>
            )}
          </AnimatePresence>

          {/* Botón de Compartir con Efecto de Resplandor */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleShare();
            }}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-primary to-amber-600 hover:from-amber-600 hover:to-primary text-black font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 shadow-[0_4px_25px_rgba(245,168,0,0.3)] hover:shadow-[0_4px_35px_rgba(245,168,0,0.4)] active:scale-95"
          >
            <Share2 size={14} className="stroke-[2.5]" />
            Compartir en mis Redes
          </button>

          {/* CTA de la marca */}
          <p className="text-[9px] text-slate-500 text-center font-bold tracking-wider uppercase leading-none mt-1">
            Defensa de Fotomultas · desmulta.online
          </p>
        </div>
      </div>
    </div>
  );
}
