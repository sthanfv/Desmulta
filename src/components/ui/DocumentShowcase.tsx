'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, ChevronLeft, ChevronRight, FileText } from 'lucide-react';

const templates = [
  {
    header: 'SEÑOR: ORGANISMO DE TRÁNSITO Y TRANSPORTE<br>E. S. D.<br>REF: DERECHO DE PETICIÓN — ART. 23 C.P.',
    title: 'Petición General',
    desc: 'Plantilla exploratoria para exigir copia de comparendos y guías de envío al Tránsito.',
    price: '$20.000',
    successRate: '95% Éxito',
  },
  {
    header: 'AL DESPACHO DEL INSPECTOR DE TRÁNSITO<br>E. S. D.<br>REF: SOLICITUD DE PRESCRIPCIÓN — ART. 159 C.N.T.',
    title: 'Prescripción Directa (3 Años)',
    desc: 'Solicite la eliminación de la multa tras haber cumplido 3 años sin mandamiento de pago.',
    price: '$30.000',
    successRate: '98% Éxito',
  },
  {
    header: 'OFICINA DE EJECUCIONES COACTIVAS DE TRÁNSITO<br>E. S. D.<br>REF: EXCEPCIÓN DE PRESCRIPCIÓN ACUMULADA (3+3)',
    title: 'Doble Prescripción (Coactivo)',
    desc: 'Levante embargos y exija caducidad si han pasado 6 años sin pago efectivo o remate.',
    price: '$60.000',
    successRate: '94% Éxito',
  },
  {
    header: 'AUTORIDAD DE TRÁNSITO Y TRANSPORTE<br>E. S. D.<br>REF: RECURSO DE NULIDAD CONTRA FOTOMULTA — SENT. C-038/20',
    title: 'Nulidad de Fotomulta',
    desc: 'Tumbe su fotomulta exigiendo la plena identificación del infractor obligada por la Corte.',
    price: '$40.000',
    successRate: '96% Éxito',
  },
  {
    header: 'SEÑOR: JUEZ CONSTITUCIONAL DE LA REPÚBLICA<br>E. S. D.<br>REF: ACCIÓN DE TUTELA — VULNERACIÓN DEBIDO PROCESO',
    title: 'Acción de Tutela (Silencio)',
    desc: 'Demande a Tránsito ante un juez si ignoran sus peticiones o violan su debido proceso.',
    price: '$25.000',
    successRate: '99% Éxito',
  },
];

const AUTOPLAY_DELAY = 4500;

export function DocumentShowcase() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const rafRef = useRef<number | null>(null);

  // Física LERP
  const mouseX = useRef(0);
  const mouseY = useRef(0);
  const targetX = useRef(0);
  const targetY = useRef(0);
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
    if (index === currentIndex || isFading) return;
    
    setIsFading(true);
    targetY.current = -0.5; // Empujoncito físico

    setTimeout(() => {
      setCurrentIndex(index);
      setIsFading(false);
    }, 300); // 300ms debe coincidir con la duración de Tailwind (duration-300)

    resetAutoplay();
  };

  const handleNext = () => {
    setCurrentIndex((prev) => {
      const nextIndex = (prev + 1) % templates.length;
      changeCard(nextIndex);
      return prev; // No mutamos aquí directamente para respetar la animación, se muta en el timeout
    });
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => {
      const prevIndex = (prev - 1 + templates.length) % templates.length;
      changeCard(prevIndex);
      return prev;
    });
  };

  const lerp = (start: number, end: number, factor: number) => {
    return start + (end - start) * factor;
  };

  useEffect(() => {
    const animateLoop = () => {
      if (!isHovering.current) {
        targetX.current = 0;
        targetY.current = 0;
      }

      mouseX.current = lerp(mouseX.current, targetX.current, 0.08);
      mouseY.current = lerp(mouseY.current, targetY.current, 0.08);

      const rotX = 15 + mouseY.current * -10;
      const rotY = -10 + mouseX.current * 10;

      if (stackRef.current) {
        stackRef.current.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
      }

      rafRef.current = requestAnimationFrame(animateLoop);
    };

    rafRef.current = requestAnimationFrame(animateLoop);
    startAutoplay();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stopAutoplay();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInput = (clientX: number, clientY: number, rect: DOMRect) => {
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    targetX.current = (clientX - centerX) / (rect.width / 2);
    targetY.current = (clientY - centerY) / (rect.height / 2);
  };

  // Swipes
  const touchStartX = useRef(0);

  const activeTemplate = templates[currentIndex];

  return (
    <div 
      className="w-full flex justify-center items-center relative group cursor-grab active:cursor-grabbing pb-12"
      style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
      ref={containerRef}
      onMouseEnter={() => {
        isHovering.current = true;
        stopAutoplay();
      }}
      onMouseLeave={() => {
        isHovering.current = false;
        startAutoplay();
      }}
      onMouseMove={(e) => {
        if (!isHovering.current || !containerRef.current) return;
        handleInput(e.clientX, e.clientY, containerRef.current.getBoundingClientRect());
      }}
      onTouchStart={(e) => {
        isHovering.current = true;
        stopAutoplay();
        touchStartX.current = e.touches[0].clientX;
        if (containerRef.current) {
          handleInput(e.touches[0].clientX, e.touches[0].clientY, containerRef.current.getBoundingClientRect());
        }
      }}
      onTouchMove={(e) => {
        if (!isHovering.current || !containerRef.current) return;
        handleInput(e.touches[0].clientX, e.touches[0].clientY, containerRef.current.getBoundingClientRect());
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
        style={{ transformStyle: 'preserve-3d', transform: 'rotateX(15deg) rotateY(-10deg)' }}
      >
        {/* SVG Texture Pattern */}
        <svg className="hidden">
          <filter id="noiseFilter">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
          </filter>
        </svg>
        
        {/* Carta Trasera 2 */}
        <div 
          className="absolute inset-0 rounded-3xl bg-card border border-border"
          style={{ 
            transform: 'translateZ(-30px) translateX(25px) translateY(-25px)',
            boxShadow: 'var(--tw-shadow-color, -15px 25px 40px -10px rgba(0,0,0,0.2)), inset 0 1px 0 rgba(255,255,255,0.8)',
          }}
        >
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ filter: 'url(#noiseFilter)' }} />
        </div>

        {/* Carta Trasera 1 */}
        <div 
          className="absolute inset-0 rounded-3xl bg-card border border-border"
          style={{ 
            transform: 'translateZ(-15px) translateX(12px) translateY(-12px)',
            boxShadow: 'var(--tw-shadow-color, -15px 25px 40px -10px rgba(0,0,0,0.2)), inset 0 1px 0 rgba(255,255,255,0.8)',
          }}
        >
           <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ filter: 'url(#noiseFilter)' }} />
        </div>

        {/* Carta Frontal */}
        <div 
          className="absolute inset-0 rounded-3xl bg-card text-card-foreground flex flex-col p-6 sm:p-8 z-10 overflow-hidden border border-border"
          style={{ 
            transform: 'translateZ(0)',
            boxShadow: 'var(--tw-shadow-color, -15px 25px 40px -10px rgba(0,0,0,0.2)), inset 0 1px 0 rgba(255,255,255,0.8)',
          }}
        >
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ filter: 'url(#noiseFilter)' }} />
          
          {/* Tag Éxito */}
          <div className="flex-none mb-4 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[11px] font-bold border border-emerald-200 animate-pulse">
              <Shield size={12} className="fill-emerald-600/20" />
              {activeTemplate.successRate}
            </div>
          </div>

          {/* Contenido Dinámico */}
          <div 
            className={`flex-grow flex flex-col justify-center relative z-10 transition-opacity duration-300 ${isFading ? 'opacity-0' : 'opacity-100'}`}
          >
            <div 
              className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase mb-3 leading-relaxed font-semibold"
              dangerouslySetInnerHTML={{ __html: activeTemplate.header }}
            />
            
            <h3 className="text-2xl sm:text-3xl font-black text-foreground mb-2 leading-tight tracking-tight">
              {activeTemplate.title}
            </h3>
            
            <p className="text-sm text-muted-foreground italic font-medium leading-relaxed">
              {activeTemplate.desc}
            </p>

            {/* Falso cuerpo del documento difuminado */}
            <div className="mt-5 space-y-2 text-[8px] text-muted-foreground leading-relaxed blur-[1.5px] opacity-25 select-none pointer-events-none hidden sm:block">
              <p>Yo, mayor de edad, identificado como aparece al pie de mi firma, en ejercicio del Derecho Constitucional de Petición consagrado en el artículo 23 de la Constitución Política y la Ley 1437 de 2011...</p>
              <p>Solicito respetuosamente se sirva ordenar la actualización de las bases de datos correspondientes al SIMIT y RUNT de las siguientes obligaciones contravencionales que figuran a mi nombre...</p>
            </div>
          </div>

          {/* Footer Carta */}
          <div className={`flex-none mt-6 pt-4 border-t border-zinc-200 relative z-10 transition-opacity duration-300 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
            <div className="flex justify-between items-end mb-4">
              <div>
                <p className="text-[10px] text-muted-foreground mb-1 font-semibold uppercase tracking-wider">Precio especial</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-foreground">{activeTemplate.price}</span>
                  <span className="text-xs font-bold text-muted-foreground">COP</span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => router.push('/plantillas')}
              className="w-full py-3.5 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-sm sm:text-base rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 group/btn focus:outline-none"
            >
              <span>Ver Solución Legal</span>
              <FileText size={18} className="group-hover/btn:-translate-y-1 group-hover/btn:rotate-6 transition-transform" />
            </button>
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
