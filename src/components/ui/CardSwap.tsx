'use client';

import React, { useState, useEffect, useRef } from 'react';
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

export function CardSwap({
  width = 340,
  height = 440,
  delay = 5000,
  pauseOnHover = true,
  cardDistance = 14, // Desfase horizontal sutil
  verticalDistance = 10, // Desfase vertical sutil
  children,
}: CardSwapProps) {
  const [cards, setCards] = useState<React.ReactNode[]>(children);
  const [isSwapping, setIsSwapping] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isHoveredRef = useRef(false);

  const triggerSwap = () => {
    if (isSwapping || cards.length < 2) return;
    setIsSwapping(true);

    // La primera tarjeta se desliza hacia la izquierda
    setTimeout(() => {
      setCards((prev) => {
        const [front, ...rest] = prev;
        return [...rest, front];
      });
      setIsSwapping(false);
    }, 300);
  };

  useEffect(() => {
    const startTimer = () => {
      timerRef.current = setInterval(() => {
        if (!isHoveredRef.current || !pauseOnHover) {
          triggerSwap();
        }
      }, delay);
    };

    startTimer();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, isSwapping, delay, pauseOnHover]);

  const handleMouseEnter = () => {
    isHoveredRef.current = true;
  };

  const handleMouseLeave = () => {
    isHoveredRef.current = false;
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (isSwapping) return;

    const swipeThreshold = 70;
    if (Math.abs(info.offset.x) > swipeThreshold) {
      triggerSwap();
    }
  };

  // OPTIMIZACIÓN DE RENDIMIENTO: Solo renderizamos en el DOM las primeras 3 tarjetas.
  // Las posiciones 4 y 5 están ocultas en el fondo y no aportan nada al campo visual,
  // por lo que eliminarlas del DOM alivia drásticamente la carga de renderizado de la GPU.
  const visibleCards = cards.slice(0, 3);

  return (
    <div
      className="relative flex items-center justify-center select-none overflow-visible"
      style={{
        width,
        height,
        perspective: '1000px',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <AnimatePresence mode="popLayout">
        {visibleCards.map((card, index) => {
          const isFront = index === 0;
          const depth = index;

          const targetX = -depth * cardDistance; // Apuntar hacia la izquierda
          const targetY = depth * verticalDistance;
          const zIndex = cards.length - depth;
          const scale = 1 - depth * 0.02;

          return (
            <m.div
              key={React.isValidElement(card) ? card.key || index : index}
              style={{
                width: '100%',
                height: '100%',
                zIndex,
                touchAction: isFront ? 'none' : 'auto',
                willChange: 'transform, opacity', // Optimización de renderizado para aceleración por GPU
              }}
              className={`absolute top-0 left-0 origin-top-left ${isFront ? 'cursor-grab active:cursor-grabbing' : ''}`}
              drag={isFront ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.55}
              onDragEnd={handleDragEnd}
              initial={
                isFront
                  ? { opacity: 1, x: 0, y: 0, scale: 1 }
                  : { opacity: 1, x: targetX, y: targetY, scale: scale }
              }
              animate={
                isSwapping && isFront
                  ? {
                      opacity: 1,
                      x: '-120%',
                      y: 0,
                      scale: 0.9,
                      transition: { duration: 0.3, ease: 'easeOut' }, // Sale rápido sin volverse transparente
                    }
                  : {
                      opacity: 1,
                      x: targetX,
                      y: targetY,
                      scale: scale,
                      transition: { duration: 0.5, ease: 'easeInOut' },
                    }
              }
              exit={{
                opacity: 0,
                scale: 0.92,
                transition: { duration: 0.25 },
              }}
            >
              <div className="w-full h-full rounded-2xl bg-white dark:bg-[#120F17] border-zinc-200 dark:border-neutral-800 border-2 shadow-2xl p-6 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute -inset-px bg-gradient-to-tr from-primary/5 via-transparent to-black/5 dark:to-white/5 rounded-2xl opacity-40 pointer-events-none" />
                {depth > 0 && (
                  <div 
                    className="absolute inset-0 bg-white/60 dark:bg-black/60 pointer-events-none" 
                    style={{ opacity: depth * 0.4 }}
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
