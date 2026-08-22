'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, ChevronLeft, ChevronRight, FileText } from 'lucide-react';

const templates = [
  {
    header:
      'SEÑOR: ORGANISMO DE TRÁNSITO Y TRANSPORTE<br>E. S. D.<br>REF: DERECHO DE PETICIÓN — ART. 23 C.P.',
    title: 'Petición General',
    desc: 'Plantilla exploratoria para exigir copia de comparendos y guías de envío al Tránsito.',
    price: '$19.500',
    successRate: '95% Éxito',
  },
  {
    header:
      'AL DESPACHO DEL INSPECTOR DE TRÁNSITO<br>E. S. D.<br>REF: SOLICITUD DE PRESCRIPCIÓN — ART. 159 C.N.T.',
    title: 'Prescripción Directa (3 Años)',
    desc: 'Solicite la eliminación de la multa tras haber cumplido 3 años sin mandamiento de pago.',
    price: '$29.500',
    successRate: '98% Éxito',
  },
  {
    header:
      'OFICINA DE EJECUCIONES COACTIVAS DE TRÁNSITO<br>E. S. D.<br>REF: EXCEPCIÓN DE PRESCRIPCIÓN ACUMULADA (3+3)',
    title: 'Doble Prescripción (Coactivo)',
    desc: 'Levante embargos y exija caducidad si han pasado 6 años sin pago efectivo o remate.',
    price: '$39.500',
    successRate: '94% Éxito',
  },
  {
    header:
      'AUTORIDAD DE TRÁNSITO Y TRANSPORTE<br>E. S. D.<br>REF: RECURSO DE NULIDAD CONTRA FOTOMULTA — SENT. C-038/20',
    title: 'Nulidad de Fotomulta',
    desc: 'Tumbe su fotomulta exigiendo la plena identificación del infractor obligada por la Corte.',
    price: '$24.500',
    successRate: '96% Éxito',
  },
  {
    header:
      'SEÑOR: JUEZ CONSTITUCIONAL DE LA REPÚBLICA<br>E. S. D.<br>REF: ACCIÓN DE TUTELA — VULNERACIÓN DEBIDO PROCESO',
    title: 'Acción de Tutela (Silencio)',
    desc: 'Demande a Tránsito ante un juez si ignoran sus peticiones o violan su debido proceso.',
    price: '$19.500',
    successRate: '99% Éxito',
  },
];

const AUTOPLAY_DELAY = 4500;

export function DocumentShowcase() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isHovering = useRef(false);

  const startAutoplay = () => {
    if (!timerRef.current) {
      timerRef.current = setInterval(() => {
        handleNext();
      }, AUTOPLAY_DELAY);
    }
  };

  const stopAutoplay = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const resetAutoplay = () => {
    stopAutoplay();
    startAutoplay();
  };

  const changeCard = (index: number) => {
    if (index === currentIndex) return;
    setCurrentIndex(index);
    resetAutoplay();
  };

  const handleNext = () => {
    const nextIndex = (currentIndex + 1) % templates.length;
    changeCard(nextIndex);
  };

  const handlePrev = () => {
    const prevIndex = (currentIndex - 1 + templates.length) % templates.length;
    changeCard(prevIndex);
  };

  useEffect(() => {
    startAutoplay();
    return () => {
      stopAutoplay();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swipes
  const touchStartX = useRef(0);

  const activeTemplate = templates[currentIndex];

  return (
    <div
      className="w-full flex justify-center items-center relative group cursor-grab active:cursor-grabbing pb-12"
      ref={containerRef}
      onMouseEnter={() => {
        isHovering.current = true;
        stopAutoplay();
      }}
      onMouseLeave={() => {
        isHovering.current = false;
        startAutoplay();
      }}
      onTouchStart={(e) => {
        isHovering.current = true;
        stopAutoplay();
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        isHovering.current = false;
        startAutoplay();
        const touchEndX = e.changedTouches[0].clientX;
        const diffX = touchStartX.current - touchEndX;
        if (Math.abs(diffX) > 60) {
          if (diffX > 0) handleNext();
          else handlePrev();
        }
      }}
    >
      {/* Aura brillante detrás del stack */}
      <div className="absolute -inset-10 bg-[radial-gradient(circle_at_50%_50%,rgba(255,193,7,0.1),transparent_60%)] z-[-1] opacity-0 dark:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Flechas eliminadas para mejor UX táctil e indicadores */}

      {/* Stack de Cartas */}
      <div
        ref={stackRef}
        className="relative w-full max-w-[320px] aspect-[3/4.2] will-change-transform"
        style={{ transform: 'translateX(0px) translateY(0px)' }}
      >
        {/* SVG Texture Pattern */}
        <svg className="hidden">
          <filter id="noiseFilter">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.85"
              numOctaves="3"
              stitchTiles="stitch"
            />
          </filter>
        </svg>

        {/* Carta Trasera 2 */}
        <div
          className="absolute inset-0 rounded-3xl bg-card border border-border overflow-hidden"
          style={{
            transform: 'rotate(10deg) translateX(10px) translateY(5px)',
            transformOrigin: 'bottom left',
            boxShadow:
              'var(--tw-shadow-color, 0 10px 30px -10px rgba(0,0,0,0.15)), inset 0 1px 0 rgba(255,255,255,0.8)',
          }}
        >
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{ filter: 'url(#noiseFilter)' }}
          />
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-primary/20 dark:bg-primary/10 rounded-full blur-[50px] pointer-events-none" />
        </div>

        {/* Carta Trasera 1 */}
        <div
          className="absolute inset-0 rounded-3xl bg-card border border-border overflow-hidden"
          style={{
            transform: 'rotate(5deg) translateX(5px) translateY(2px)',
            transformOrigin: 'bottom left',
            boxShadow:
              'var(--tw-shadow-color, 0 15px 35px -10px rgba(0,0,0,0.15)), inset 0 1px 0 rgba(255,255,255,0.8)',
          }}
        >
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{ filter: 'url(#noiseFilter)' }}
          />
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-primary/20 dark:bg-primary/10 rounded-full blur-[50px] pointer-events-none" />
        </div>

        {/* Carta Frontal */}
        <div
          className="absolute inset-0 rounded-3xl bg-card text-card-foreground flex flex-col p-3 sm:p-4 z-10 overflow-hidden border border-border"
          style={{
            transform: 'rotate(0deg)',
            transformOrigin: 'bottom left',
            boxShadow:
              'var(--tw-shadow-color, 0 25px 50px -12px rgba(0,0,0,0.25)), inset 0 1px 0 rgba(255,255,255,0.8)',
          }}
        >
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{ filter: 'url(#noiseFilter)' }}
          />

          {/* Brillo amarillo (Glow) estilo premium */}
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-primary/30 dark:bg-primary/10 rounded-full blur-[40px] pointer-events-none z-0" />

          {/* Contenedor del Carrusel Interno (Fade) */}
          <div className="flex-grow relative z-10 w-full h-full overflow-hidden">
            {templates.map((template, idx) => (
              <div
                key={idx}
                className={`absolute inset-0 w-full h-full flex flex-col transition-opacity duration-700 ease-in-out ${
                  idx === currentIndex
                    ? 'opacity-100 z-10 pointer-events-auto'
                    : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                {/* Tag Éxito */}
                <div className="flex-none mb-1">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[8px] sm:text-[9px] font-bold border border-emerald-200 dark:border-emerald-500/20 animate-pulse">
                    <Shield size={10} className="fill-emerald-600/20 dark:fill-emerald-400/20" />
                    {template.successRate}
                  </div>
                </div>

                {/* Textos */}
                <div className="flex-grow flex flex-col justify-center relative min-h-0">
                  <div
                    className="text-[7px] sm:text-[8px] text-muted-foreground font-mono tracking-widest uppercase mb-1 leading-relaxed font-semibold relative z-10"
                    dangerouslySetInnerHTML={{
                      // 🛡️ FIX HALLAZGO #7: Sanitización preventiva contra XSS si la fuente cambia a futuro.
                      __html: template.header.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
                    }}
                  />

                  <h3 className="text-base sm:text-xl font-black text-foreground mb-1 leading-tight tracking-tight relative z-10">
                    {template.title}
                  </h3>

                  <p className="text-[10px] sm:text-xs text-muted-foreground italic font-medium leading-tight line-clamp-2 relative z-10">
                    {template.desc}
                  </p>

                  {/* Falso cuerpo del documento difuminado (Background absoluto para no empujar el flex) */}
                  <div
                    className="absolute bottom-0 translate-y-2 left-0 right-0 text-[6px] sm:text-[7px] text-muted-foreground leading-tight blur-[1px] opacity-25 select-none pointer-events-none hidden sm:block overflow-hidden z-0"
                    style={{ height: '50px' }}
                  >
                    <p>
                      Yo, mayor de edad, identificado como aparece al pie de mi firma, en ejercicio
                      del Derecho Constitucional de Petición consagrado en el artículo 23 de la
                      Constitución Política y la Ley 1437 de 2011. Solicito respetuosamente se sirva
                      ordenar la actualización de las bases de datos correspondientes al SIMIT y
                      RUNT...
                    </p>
                  </div>
                </div>

                {/* Footer Carta */}
                <div className="flex-none mt-2 pt-2 border-t border-border">
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <p className="text-[8px] text-muted-foreground mb-0.5 font-semibold uppercase tracking-wider">
                        Precio especial
                      </p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl sm:text-2xl font-black text-foreground">
                          {template.price}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => router.push('/plantillas')}
                    className="w-full py-2 px-3 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs sm:text-sm rounded-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-1.5 group/btn focus:outline-none"
                  >
                    <span>Ver Solución Legal</span>
                    <FileText
                      size={14}
                      className="group-hover/btn:-translate-y-1 group-hover/btn:rotate-6 transition-transform"
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Flechas eliminadas */}

      {/* Indicadores */}
      <div className="absolute -bottom-8 left-0 right-0 flex justify-center gap-2">
        {templates.map((_, idx) => (
          <button
            key={idx}
            onClick={() => changeCard(idx)}
            className={`h-2 rounded-full transition-all duration-300 ${
              idx === currentIndex ? 'w-6 bg-primary' : 'w-2 bg-zinc-300 dark:bg-zinc-700'
            }`}
            aria-label={`Ver documento ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
