'use client';

import React, {
  Children,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import gsap from 'gsap';

export interface CardSwapProps {
  width?: number | string;
  height?: number | string;
  cardDistance?: number;
  verticalDistance?: number;
  delay?: number;
  pauseOnHover?: boolean;
  onCardClick?: (idx: number) => void;
  skewAmount?: number;
  easing?: 'linear' | 'elastic';
  children: React.ReactNode[];
}

interface Slot {
  x: number;
  y: number;
  z: number;
  zIndex: number;
}

const makeSlot = (i: number, distX: number, distY: number, total: number): Slot => ({
  x: i * distX,
  y: -i * distY,
  z: -i * distX * 1.5,
  zIndex: total - i
});

const placeNow = (el: HTMLElement, slot: Slot, skew: number) =>
  gsap.set(el, {
    x: slot.x,
    y: slot.y,
    z: slot.z,
    xPercent: -50,
    yPercent: -50,
    skewY: skew,
    transformOrigin: 'center center',
    zIndex: slot.zIndex,
    force3D: true
  });

export function CardSwap({
  width = 340,
  height = 440,
  cardDistance = 20,
  verticalDistance = 14,
  delay = 5000,
  pauseOnHover = true,
  onCardClick,
  skewAmount = 2.5,
  easing = 'elastic',
  children
}: CardSwapProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const activeCardDist = isMobile ? cardDistance * 0.45 : cardDistance;
  const activeVertDist = isMobile ? verticalDistance * 0.45 : verticalDistance;

  const config = useMemo(() => 
    easing === 'elastic'
      ? {
          ease: 'elastic.out(0.6, 0.9)',
          durDrop: 1.8,
          durMove: 1.8,
          durReturn: 1.8,
          promoteOverlap: 0.85,
          returnDelay: 0.05
        }
      : {
          ease: 'power2.inOut',
          durDrop: 0.8,
          durMove: 0.8,
          durReturn: 0.8,
          promoteOverlap: 0.45,
          returnDelay: 0.2
        },
    [easing]
  );

  const childArr = useMemo(() => Children.toArray(children), [children]);
  const totalCards = childArr.length;
  
  // Guardamos las referencias a los elementos del DOM de las tarjetas
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const order = useRef<number[]>([]);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Inicializar orden de las tarjetas
  useEffect(() => {
    order.current = Array.from({ length: totalCards }, (_, i) => i);
  }, [totalCards]);

  useEffect(() => {
    if (totalCards === 0) return;

    // Asegurar posicionamiento inicial de todas las capas
    cardRefs.current.forEach((el, i) => {
      if (!el) return;
      const slot = makeSlot(i, activeCardDist, activeVertDist, totalCards);
      placeNow(el, slot, skewAmount);
      
      // Aplicar opacidad del overlay de profundidad inicial
      const overlay = el.querySelector('.depth-overlay') as HTMLElement;
      if (overlay) {
        gsap.set(overlay, { opacity: i === 0 ? 0 : Math.min(i * 0.35, 0.8) });
      }
    });

    const swap = () => {
      if (order.current.length < 2) return;

      const [front, ...rest] = order.current;
      const elFront = cardRefs.current[front];
      if (!elFront) return;

      const tl = gsap.timeline({
        onComplete: () => {
          order.current = [...rest, front];
        }
      });
      tlRef.current = tl;

      // Caída/salida de la tarjeta frontal (hacia abajo y un poco rotada)
      tl.to(elFront, {
        y: '+=500',
        rotationZ: 12,
        opacity: 0,
        scale: 0.75,
        duration: config.durDrop * 0.45,
        ease: 'power2.in'
      });

      // Promoción de las tarjetas traseras
      tl.addLabel('promote', `-=${config.durDrop * 0.2}`);
      rest.forEach((idx, i) => {
        const el = cardRefs.current[idx];
        if (!el) return;
        const slot = makeSlot(i, activeCardDist, activeVertDist, totalCards);
        
        tl.set(el, { zIndex: slot.zIndex }, 'promote');
        tl.to(
          el,
          {
            x: slot.x,
            y: slot.y,
            z: slot.z,
            skewY: skewAmount,
            scale: i === 0 ? 1 : i === 1 ? 0.92 : 0.84, // Escala escalonada
            duration: config.durMove * 0.5,
            ease: config.ease
          },
          'promote'
        );

        // Animar el overlay de profundidad
        const overlay = el.querySelector('.depth-overlay') as HTMLElement;
        if (overlay) {
          tl.to(
            overlay,
            {
              opacity: i === 0 ? 0 : Math.min(i * 0.35, 0.8),
              duration: config.durMove * 0.5,
              ease: config.ease
            },
            'promote'
          );
        }
      });

      // Retorno de la tarjeta vieja al fondo del stack
      const backSlot = makeSlot(totalCards - 1, activeCardDist, activeVertDist, totalCards);
      tl.addLabel('return');
      
      tl.set(elFront, { 
        zIndex: backSlot.zIndex,
        rotationZ: 0,
        scale: 0.84
      }, 'return');

      tl.to(
        elFront,
        {
          x: backSlot.x,
          y: backSlot.y,
          z: backSlot.z,
          opacity: 1,
          duration: config.durReturn * 0.45,
          ease: 'power2.out'
        },
        'return'
      );

      const frontOverlay = elFront.querySelector('.depth-overlay') as HTMLElement;
      if (frontOverlay) {
        tl.to(
          frontOverlay,
          {
            opacity: Math.min((totalCards - 1) * 0.35, 0.8),
            duration: config.durReturn * 0.45,
            ease: 'power2.out'
          },
          'return'
        );
      }
    };

    // Inicializar el intervalo de auto-swap
    if (!isHovered || !pauseOnHover) {
      intervalRef.current = setInterval(swap, delay);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (tlRef.current) tlRef.current.kill();
    };
  }, [activeCardDist, activeVertDist, delay, pauseOnHover, skewAmount, totalCards, config, isHovered]);

  const handleMouseEnter = () => {
    if (pauseOnHover) {
      setIsHovered(true);
      if (intervalRef.current) clearInterval(intervalRef.current);
      tlRef.current?.pause();
    }
  };

  const handleMouseLeave = () => {
    if (pauseOnHover) {
      setIsHovered(false);
      tlRef.current?.play();
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative select-none overflow-visible shrink-0 mx-auto [perspective:1200px] origin-center max-[768px]:scale-[0.8] max-[480px]:scale-[0.65]"
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {childArr.map((child, i) => (
        <div
          key={i}
          ref={el => { cardRefs.current[i] = el; }}
          className="absolute top-1/2 left-1/2 rounded-2xl border shadow-2xl p-6 flex flex-col justify-between overflow-hidden bg-card text-card-foreground border-border [transform-style:preserve-3d] [will-change:transform] [backface-visibility:hidden] cursor-pointer"
          style={{
            width: typeof width === 'number' ? `${width}px` : width,
            height: typeof height === 'number' ? `${height}px` : height,
            transition: 'background-color 0.3s ease, border-color 0.3s ease',
          }}
          onClick={() => {
            onCardClick?.(i);
          }}
        >
          {/* Gradiente sutil de profundidad */}
          <div className="absolute -inset-px bg-gradient-to-tr from-primary/5 via-transparent to-foreground/[0.03] rounded-2xl opacity-50 pointer-events-none" />
          
          {/* Overlay de profundidad */}
          <div className="depth-overlay absolute inset-0 rounded-2xl pointer-events-none bg-black/20 dark:bg-black/50 transition-opacity duration-300" />
          
          {/* Contenido real de la tarjeta */}
          <div className="relative z-10 w-full h-full flex flex-col justify-between">
            {child}
          </div>
        </div>
      ))}
    </div>
  );
}
