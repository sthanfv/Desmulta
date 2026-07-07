'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { m, AnimatePresence, PanInfo } from 'framer-motion';

export interface CardSwapProps {
  width?: number | string;
  height?: number | string;
  delay?: number;
  pauseOnHover?: boolean;
  cardDistance?: number;
  verticalDistance?: number;
  children: React.ReactNode[];
}

/**
 * Configuración de posición, escala y brillo para cada capa del stack.
 * Índice 0 = frente, índice 1 = segunda, índice 2 = tercera (fondo).
 */
const STACK_CONFIG = [
  { x: 0, y: 0, scale: 1, rotateZ: 0, zIndex: 30, brightness: 1 },
  { x: 20, y: 14, scale: 0.92, rotateZ: 2.5, zIndex: 20, brightness: 0.7 },
  { x: 38, y: 26, scale: 0.84, rotateZ: 5, zIndex: 10, brightness: 0.48 },
];

/** Resorte para avance de tarjetas desde el fondo hacia el frente */
const SPRING_IN = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
  mass: 0.85,
};

/** Transición de salida de la tarjeta frontal */
const EXIT_SPRING = {
  type: 'spring' as const,
  stiffness: 340,
  damping: 32,
  mass: 0.7,
};

export function CardSwap({
  width = 340,
  height = 440,
  delay = 5000,
  pauseOnHover = true,
  children,
}: CardSwapProps) {
  const [cards, setCards] = useState<React.ReactNode[]>(children);
  const [isSwapping, setIsSwapping] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isHoveredRef = useRef(false);

  const triggerSwap = useCallback(() => {
    if (isSwapping || cards.length < 2) return;
    setIsSwapping(true);

    // Esperamos a que la animación de salida de la tarjeta frontal termine
    // para luego rotar el array y restablecer el estado
    setTimeout(() => {
      setCards((prev) => {
        const [front, ...rest] = prev;
        return [...rest, front];
      });
      setIsSwapping(false);
    }, 440);
  }, [isSwapping, cards.length]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      if (!isHoveredRef.current || !pauseOnHover) {
        triggerSwap();
      }
    }, delay);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [triggerSwap, delay, pauseOnHover]);

  const handleMouseEnter = () => {
    isHoveredRef.current = true;
  };
  const handleMouseLeave = () => {
    isHoveredRef.current = false;
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (isSwapping) return;
    // Umbral de 60px en cualquier eje para disparar el swap con drag
    if (Math.abs(info.offset.x) > 60 || Math.abs(info.offset.y) > 60) {
      triggerSwap();
    }
  };

  // OPTIMIZACIÓN: Solo renderizamos las primeras 3 tarjetas del stack visible
  const visibleCards = cards.slice(0, Math.min(3, cards.length));

  return (
    <div
      className="relative flex items-center justify-center select-none overflow-visible"
      style={{
        width,
        height,
        perspective: '1200px',
        perspectiveOrigin: '50% 40%',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {visibleCards.map((card, index) => {
          const isFront = index === 0;
          const cfg = STACK_CONFIG[index] ?? STACK_CONFIG[STACK_CONFIG.length - 1];
          const lastCfg = STACK_CONFIG[STACK_CONFIG.length - 1];

          return (
            <m.div
              key={React.isValidElement(card) ? (card.key ?? index) : index}
              style={
                {
                  width: '100%',
                  height: '100%',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  zIndex: cfg.zIndex,
                  touchAction: isFront ? 'pan-y' : 'auto',
                  willChange: 'transform, opacity',
                  originX: '50%',
                  originY: '50%',
                  // Escala de brillo ajustada: en modo claro el oscurecimiento no queda tan intenso
                  filter: `brightness(${cfg.brightness})`,
                } as React.CSSProperties
              }
              className={isFront ? 'cursor-grab active:cursor-grabbing' : ''}
              drag={isFront ? true : false}
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
              dragElastic={0.35}
              onDragEnd={handleDragEnd}
              /*
               * initial: la tarjeta nueva entra desde la posición de fondo del stack
               * (pequeña, desplazada, semiopaca) y avanza hacia su lugar con el resorte.
               */
              initial={{
                x: lastCfg.x,
                y: lastCfg.y,
                scale: lastCfg.scale,
                rotateZ: lastCfg.rotateZ,
                opacity: isFront ? 0.55 : 1,
              }}
              /*
               * animate: si es la tarjeta frontal y está swapping, sale hacia
               * adelante-abajo con rotación, como si la empujáramos al fondo de la baraja.
               * Si no, anima hacia su posición de reposo en el stack.
               */
              animate={
                isSwapping && isFront
                  ? {
                      x: 55,
                      y: 90,
                      scale: 0.72,
                      rotateZ: 14,
                      opacity: 0,
                      transition: EXIT_SPRING,
                    }
                  : {
                      x: cfg.x,
                      y: cfg.y,
                      scale: cfg.scale,
                      rotateZ: cfg.rotateZ,
                      opacity: 1,
                      transition: SPRING_IN,
                    }
              }
            >
              {/* Tarjeta — fondo papel adaptativo al tema */}
              <div
                className="w-full h-full rounded-2xl border shadow-2xl p-6 flex flex-col justify-between relative overflow-hidden bg-card text-card-foreground border-border"
                style={{ transition: 'background-color 0.3s ease, border-color 0.3s ease' }}
              >
                {/* Gradiente sutil de profundidad */}
                <div className="absolute -inset-px bg-gradient-to-tr from-primary/5 via-transparent to-foreground/[0.03] rounded-2xl opacity-50 pointer-events-none" />
                {/*
                 * Overlay de profundidad: en modo claro usa negro translúcido (sombra de papel),
                 * en modo oscuro igual. El filter brightness del contenedor padre ya oscurece
                 * el conjunto, este overlay refuerza el efecto en los bordes.
                 */}
                {index > 0 && (
                  <div
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{
                      background: 'rgba(0, 0, 0, 0.18)',
                      opacity: Math.min(index * 0.6, 1),
                    }}
                  />
                )}
                {card}
              </div>
            </m.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
