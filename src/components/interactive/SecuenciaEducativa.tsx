'use client';

import { useState } from 'react';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import {
  Scale,
  ShieldAlert,
  BadgeAlert,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
} from 'lucide-react';
import type { InfoEducativa } from '@/hooks/useSIMITValidator';
import { Haptics } from '@/lib/utils/haptics';

/**
 * Componente SecuenciaEducativa — Carrusel pedagógico post-OCR.
 *
 * Modo de navegación SECUENCIAL (Multa X de N):
 * - Si hay solo 1 infracción: muestra la tarjeta sin botones de navegación.
 * - Si hay múltiples: obliga al usuario a avanzar multa por multa con botones
 *   "Anterior" y "Siguiente", fomentando la lectura completa de cada caso.
 * - Al llegar a la última multa, el botón cambia a "Listo ✓" y cierra el carrusel.
 *
 * Cero llamadas a red: el diccionario está compilado en el bundle del cliente.
 */
interface SecuenciaEducativaProps {
  infoList: InfoEducativa[];
  onClose: () => void;
}

/** Devuelve clases de color según la categoría de gravedad del código */
function getBadgeStyles(gravedad: string): { bg: string; text: string; border: string } {
  // "Categoría A (4 salarios...)" → extraer la letra en posición 10
  const letraCat = gravedad.charAt(10)?.toUpperCase() ?? '';
  switch (letraCat) {
    case 'A':
      return { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/40' };
    case 'B':
      return { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/40' };
    case 'C':
      return { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/40' };
    case 'D':
      return { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/40' };
    case 'E':
      return { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/40' };
    default:
      return { bg: 'bg-white/10', text: 'text-white/70', border: 'border-white/20' };
  }
}

export function SecuenciaEducativa({ infoList, onClose }: SecuenciaEducativaProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [expandida, setExpandida] = useState(false);
  /** Dirección de la animación: 1 = hacia adelante, -1 = hacia atrás */
  const [direccion, setDireccion] = useState<1 | -1>(1);

  if (!infoList || infoList.length === 0) return null;

  const total = infoList.length;
  const esPrimera = activeIdx === 0;
  const esUltima = activeIdx === total - 1;
  const info = infoList[activeIdx];
  const badge = getBadgeStyles(info.gravedad);
  const hayMultiples = total > 1;

  const irA = (nuevoIdx: number, dir: 1 | -1) => {
    Haptics.tap();
    setDireccion(dir);
    setExpandida(false); // Contraer el acordeón legal al navegar
    setActiveIdx(nuevoIdx);
  };

  const handleSiguiente = () => {
    if (esUltima) {
      Haptics.success();
      onClose();
    } else {
      irA(activeIdx + 1, 1);
    }
  };

  const handleAnterior = () => {
    if (!esPrimera) irA(activeIdx - 1, -1);
  };

  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence>
        <m.div
          key="educativa"
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.97 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="relative mt-4 rounded-[1.5rem] border border-white/10 bg-black/60 backdrop-blur-xl shadow-2xl overflow-hidden"
          role="region"
          aria-label="Información educativa sobre infracciones detectadas"
        >
          {/* Resplandor decorativo dinámico */}
          <div
            aria-hidden="true"
            className="absolute -top-10 left-1/2 -translate-x-1/2 w-56 h-24 rounded-full opacity-20 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, #f59e0b 0%, transparent 70%)' }}
          />

          {/* Header: Título + Contador + Botón cerrar */}
          <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Icono decorativo de balanza */}
              <div
                aria-hidden="true"
                className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shadow-lg"
              >
                <Scale size={18} className="text-primary" />
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary/80 mb-0.5">
                  {hayMultiples ? 'Múltiples Infracciones Detectadas' : 'Infracción Detectada'}
                </p>
                {/* Indicador de posición: "Multa X de N" */}
                {hayMultiples ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-white">Multa {activeIdx + 1}</span>
                    <span className="text-xs text-white/40">de {total}</span>
                    {/* Puntos de progreso */}
                    <div className="flex gap-1 ml-1" aria-hidden="true">
                      {infoList.map((_, i) => (
                        <div
                          key={i}
                          className={`rounded-full transition-all duration-300 ${
                            i === activeIdx ? 'w-3 h-1.5 bg-primary' : 'w-1.5 h-1.5 bg-white/20'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <h3 className="text-xs font-bold text-white/60 leading-tight">
                    Educación vial pedagógica sobre tu comparendo.
                  </h3>
                )}
              </div>
            </div>

            {/* Botón cerrar */}
            <button
              id="btn-cerrar-educativa"
              onClick={onClose}
              className="flex-shrink-0 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              aria-label="Cerrar información educativa"
            >
              <X size={13} className="text-white/60" />
            </button>
          </div>

          {/* Contenido Animado de la Multa Activa */}
          <AnimatePresence mode="wait" custom={direccion}>
            <m.div
              key={info.codigo}
              custom={direccion}
              variants={{
                enter: (dir: number) => ({ opacity: 0, x: dir * 24 }),
                center: { opacity: 1, x: 0 },
                exit: (dir: number) => ({ opacity: 0, x: dir * -24 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className="flex flex-col"
            >
              {/* Título de la infracción */}
              <div className="px-5 pt-2 pb-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-primary/20 text-primary border border-primary/20">
                    CÓDIGO {info.codigo}
                  </span>
                </div>
                <h4 className="text-sm font-black text-white leading-tight">{info.nombre}</h4>
              </div>

              {/* Datos clave: valor + gravedad + inmovilización */}
              <div className="flex flex-wrap gap-2 px-5 pb-3">
                {/* Valor */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                  <BadgeAlert size={12} className="text-primary flex-shrink-0" />
                  <span className="text-xs font-bold text-white/90">{info.sancion_cop}</span>
                </div>

                {/* Gravedad */}
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${badge.bg} ${badge.border}`}
                >
                  <Scale size={12} className={`${badge.text} flex-shrink-0`} />
                  <span className={`text-xs font-bold ${badge.text}`}>{info.gravedad}</span>
                </div>

                {/* Inmovilización */}
                {info.inmoviliza && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/15 border border-red-500/30">
                    <AlertTriangle size={12} className="text-red-400 flex-shrink-0" />
                    <span className="text-xs font-bold text-red-300">Inmovilización</span>
                  </div>
                )}
              </div>

              {/* Defensa clave — siempre visible */}
              <div className="mx-4 mb-3 px-4 py-3 rounded-2xl bg-primary/8 border border-primary/20">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary/70 mb-1">
                  Defensa clave para impugnar
                </p>
                <p className="text-xs text-white/85 leading-relaxed font-medium">
                  {info.defensa_clave}
                </p>
              </div>

              {/* Contexto legal — expandible */}
              <button
                id={`btn-expandir-educativa-${info.codigo}`}
                onClick={() => setExpandida((p) => !p)}
                className="w-full flex items-center justify-between px-5 py-3 border-t border-white/8 text-left hover:bg-white/5 transition-colors"
                aria-expanded={expandida}
                aria-controls={`contexto-legal-${info.codigo}`}
              >
                <div className="flex items-center gap-2">
                  <ShieldAlert size={14} className="text-white/50 flex-shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/50">
                    Justificación y análisis de debido proceso
                  </span>
                </div>
                {expandida ? (
                  <ChevronUp size={14} className="text-white/40" />
                ) : (
                  <ChevronDown size={14} className="text-white/40" />
                )}
              </button>

              <AnimatePresence>
                {expandida && (
                  <m.div
                    id={`contexto-legal-${info.codigo}`}
                    key="contexto"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden bg-white/[0.02]"
                  >
                    <div className="px-5 py-4 border-t border-white/5">
                      <p className="text-xs text-white/70 leading-relaxed">{info.contexto_legal}</p>
                    </div>
                  </m.div>
                )}
              </AnimatePresence>
            </m.div>
          </AnimatePresence>

          {/* Barra de navegación secuencial (solo con múltiples multas) */}
          {hayMultiples && (
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-white/8 bg-white/[0.02]">
              {/* Botón Anterior */}
              <button
                id="btn-anterior-educativa"
                onClick={handleAnterior}
                disabled={esPrimera}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 ${
                  esPrimera
                    ? 'opacity-0 pointer-events-none'
                    : 'bg-white/8 hover:bg-white/15 text-white/60 hover:text-white border border-white/10'
                }`}
                aria-label="Ver infracción anterior"
              >
                <ChevronLeft size={14} />
                Anterior
              </button>

              {/* Botón Siguiente / Listo */}
              <button
                id="btn-siguiente-educativa"
                onClick={handleSiguiente}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg ${
                  esUltima
                    ? 'bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/30 shadow-green-500/10'
                    : 'bg-primary text-black border border-primary/80 shadow-primary/20 hover:bg-primary/90'
                }`}
                aria-label={
                  esUltima ? 'Cerrar resumen de infracciones' : 'Ver siguiente infracción'
                }
              >
                {esUltima ? (
                  <>
                    <CheckCircle2 size={14} />
                    Listo
                  </>
                ) : (
                  <>
                    Siguiente
                    <ChevronRight size={14} />
                  </>
                )}
              </button>
            </div>
          )}
        </m.div>
      </AnimatePresence>
    </LazyMotion>
  );
}
