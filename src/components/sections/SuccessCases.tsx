'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import {
  X,
  ImageOff,
  Maximize2,
  GripVertical,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import type { ShowcaseConfig } from '@/lib/config-constants';
import { Haptics } from '@/lib/utils/haptics';
import * as Sentry from '@sentry/nextjs';
import CountUp from '@/components/ui/CountUp';

interface SuccessCase {
  id: string;
  title: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  createdAt: string;
}

interface SuccessCasesProps {
  showcaseData: ShowcaseConfig;
}

/** Ancho real del visor en línea: el contenedor es max-w-4xl (896 px) en escritorio. */
const IMAGE_SIZES_INLINE = '(min-width: 768px) 896px, 100vw';

/** Distancia (px) de arrastre horizontal para pasar de caso. */
const SWIPE_THRESHOLD = 60;

/**
 * SkeletonSlider — Placeholder animado mientras carga /api/gallery
 * Mantiene el mismo aspect-ratio que ImageSlider para evitar layout shifts (CLS).
 */
function SkeletonSlider() {
  return (
    <div
      aria-busy="true"
      className="relative aspect-[4/3] md:aspect-[16/9] w-full rounded-[2rem] overflow-hidden bg-slate-900/50 border border-slate-800"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-slate-700/50 border-t-blue-500 animate-spin" />
      </div>
      <div className="absolute bottom-8 left-8 right-8 space-y-3">
        <div className="h-6 w-1/3 bg-slate-800/80 rounded-lg animate-pulse" />
        <div className="h-4 w-1/2 bg-slate-800/40 rounded-lg animate-pulse" />
      </div>
    </div>
  );
}

/**
 * ImageSlider — Componente interactivo Premium
 * Solapa el Antes y el Después con un slider draggable.
 */
function ImageSlider({
  beforeSrc,
  afterSrc,
  isExpanded = false,
  onExpand,
  zoomScale = 1,
}: {
  beforeSrc: string;
  afterSrc: string;
  isExpanded?: boolean;
  onExpand?: () => void;
  zoomScale?: number;
}) {
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [errorBefore, setErrorBefore] = useState(false);
  const [errorAfter, setErrorAfter] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  // [2026-09-24] Antes `unoptimized`: se descargaba la foto original completa en cada teléfono.
  // Con `sizes`, Next.js sirve la variante adecuada a la pantalla (AVIF/WebP).
  const sizes = isExpanded ? '100vw' : IMAGE_SIZES_INLINE;
  const imagesReady = loadedCount >= 2;

  // Calcula exactamente en dónde cae la manija usando el cliente X
  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.max(0, Math.min((x / rect.width) * 100, 100));
    setSliderPos((prev) => {
      // Si toca los bordes (0 o 100) y antes no los estaba tocando, detonar impacto físico
      if ((percent === 0 || percent === 100) && prev !== percent) {
        // En un celular, se sentirá el tope físico simulado.
        Haptics.impact();
      }
      return percent;
    });
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation(); // Evita que se abra el zoom al tocar la manija
    setIsDragging(true);
    Haptics.slide(); // Fricción inicial al agarrar virtualmente el divisor
  };

  useEffect(() => {
    if (isDragging) {
      const handleGlobalPointerUp = () => setIsDragging(false);
      const handleGlobalPointerMove = (e: PointerEvent) => {
        // Soporte touch global para arrastrar sin perder la manija
        e.preventDefault(); // Previene scroll solo mientras se está arrastrando la manija activamente
        handleMove(e.clientX);
      };

      window.addEventListener('pointerup', handleGlobalPointerUp);
      // passive: false permite usar e.preventDefault()
      window.addEventListener('pointermove', handleGlobalPointerMove, { passive: false });

      return () => {
        window.removeEventListener('pointerup', handleGlobalPointerUp);
        window.removeEventListener('pointermove', handleGlobalPointerMove);
      };
    }
  }, [isDragging, handleMove]);

  if (errorBefore || errorAfter) {
    return (
      <div className="w-full aspect-video flex flex-col items-center justify-center gap-3 bg-muted/10 rounded-[1.5rem]">
        <ImageOff className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground font-medium">Imagen no disponible</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      // touch-pan-y permite que el navegador haga scroll vertical si el usuario desliza la imagen
      className={`relative w-full overflow-hidden touch-pan-y ${
        !isExpanded && onExpand ? 'cursor-zoom-in' : ''
      } ${
        isExpanded
          ? 'h-full flex items-center justify-center'
          : 'aspect-[4/3] md:aspect-[16/9] rounded-[2rem]'
      }`}
      onClick={() => {
        // Solo abrimos el visor si hacen clic en la imagen y no estaban arrastrando
        if (onExpand && !isExpanded) {
          onExpand();
        }
      }}
      style={{
        transform: `scale(${zoomScale}) translateZ(0)`,
        transition: isDragging ? 'none' : 'transform 0.2s ease-out',
        transformOrigin: 'center center',
        willChange: 'transform',
      }}
    >
      {/* Etiqueta de background (Después) */}
      <Image
        src={afterSrc}
        alt="Simit Paz y Salvo"
        fill
        className={`pointer-events-none transform-gpu transition-opacity duration-500 ${imagesReady ? 'opacity-100' : 'opacity-0'} ${isExpanded ? 'object-contain object-center' : 'object-cover object-left-top'}`}
        style={{ transform: 'translateZ(0)' }}
        sizes={sizes}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoadedCount((n) => n + 1)}
        onError={() => setErrorAfter(true)}
      />

      <div className="absolute top-4 right-4 z-10 px-3 py-1 bg-emerald-500/80 backdrop-blur-md rounded-full shadow-lg pointer-events-none">
        <span className="text-[10px] md:text-xs font-black text-white uppercase tracking-widest">
          Después
        </span>
      </div>

      <div
        className="absolute inset-0 z-[5] pointer-events-none transform-gpu"
        style={{
          clipPath: `inset(0 ${100 - sliderPos}% 0 0)`,
          willChange: 'clip-path',
          transform: 'translateZ(0)',
        }}
      >
        <Image
          src={beforeSrc}
          alt="Simit Multas"
          fill
          className={`transform-gpu transition-opacity duration-500 ${imagesReady ? 'opacity-100' : 'opacity-0'} ${isExpanded ? 'object-contain object-center' : 'object-cover object-left-top'}`}
          style={{ transform: 'translateZ(0)' }}
          sizes={sizes}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoadedCount((n) => n + 1)}
          onError={() => setErrorBefore(true)}
        />
        <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-rose-500/80 backdrop-blur-md rounded-full shadow-lg pointer-events-none">
          <span className="text-[10px] md:text-xs font-black text-white uppercase tracking-widest">
            Antes
          </span>
        </div>
      </div>

      {/* Línea divisoria central con manija */}
      <div
        // Área táctil extra ancha (w-12) para que los dedos gordos en celulares la agarren fácil. touch-none evita scroll al agarrarla.
        data-slider-handle
        className="absolute top-0 bottom-0 z-20 flex items-center justify-center w-12 cursor-ew-resize touch-none"
        style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
        onPointerDown={handlePointerDown}
      >
        {/* Glow de la línea centrado */}
        <div className="absolute h-full w-[2px] bg-white shadow-[0_0_10px_2px_rgba(255,255,255,0.5)]" />

        {/* Manija táctil interactiva */}
        <div
          className={`
            w-10 h-10 md:w-12 md:h-12 relative z-30 rounded-full bg-white text-black shadow-[0_0_20px_rgba(0,0,0,0.5)] flex items-center justify-center transition-transform
            ${isDragging ? 'scale-90 bg-gray-100' : 'hover:scale-110'}
          `}
        >
          <GripVertical size={20} className="text-zinc-600" />
        </div>
      </div>

      {/* Botón de expansión condicional (Visual Hint) */}
      {!isExpanded && onExpand && (
        <button
          className="absolute bottom-4 right-4 z-10 bg-black/70 hover:bg-black/90 text-white p-3 rounded-full flex items-center justify-center shadow-2xl border border-white/10 transition-all hover:scale-110 active:scale-95 pointer-events-none"
          aria-label="Ver en pantalla completa"
        >
          <Maximize2 className="w-5 h-5" />
        </button>
      )}

      {/* Instrucción visual si no lo han tocado */}
      {sliderPos === 50 && !isDragging && !isExpanded && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-full bg-black/60 border border-white/20 backdrop-blur-md pointer-events-none animate-pulse">
          <span className="text-[10px] font-black uppercase tracking-widest text-white">
            Desliza la manija central
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * SuccessCases — Sección de comparativa Antes/Después Premium
 *
 * MANDATO-FILTRO v8.11.0:
 * - Intersection Observer: el fetch a /api/gallery se difiere hasta que
 *   la sección entra en el viewport (200px de margen anticipado).
 *   Esto evita un hit a Firestore si el usuario nunca hace scroll hasta aquí.
 * - Skeleton loader premium mientras se espera la respuesta de la API.
 * - Una vez que el Observer dispara la carga, se desconecta inmediatamente
 *   para no re-ejecutar el fetch en cada intersección.
 */
/**
 * ZoomPanContainer — Contenedor interactivo avanzado para Zoom y Pan estilo WhatsApp
 * Soporta:
 * - Zoom con la ruedita del mouse (Wheel)
 * - Arrastre con clic izquierdo sostenido (Drag/Pan) en PC
 * - Pellizco táctil (Pinch-to-zoom) con dos dedos en dispositivos móviles
 * - Arrastre con un dedo (Pan) en móviles cuando el zoom es activo
 * - Doble clic / Doble toque para zoom rápido (1x ↔ 2.5x)
 * - Límites inteligentes de pantalla para que la imagen no se pierda en el infinito
 */
interface ZoomPanContainerProps {
  children: React.ReactNode;
  scale: number;
  onScaleChange: (scale: number) => void;
  activeIndex: number;
}

function ZoomPanContainer({ children, scale, onScaleChange, activeIndex }: ZoomPanContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  // Guardar posición y escala en refs para actualización directa del DOM (0 renders durante el arrastre)
  const positionRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(scale);

  const isDragging = useRef(false);
  const [isDraggingState, setIsDraggingState] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const activePointers = useRef<PointerEvent[]>([]);
  const [_numActivePointers, setNumActivePointers] = useState(0);
  const initialPinchDistance = useRef(0);
  const initialScale = useRef(1);

  // Función de actualización directa del DOM con hoisting
  function updateTransform(useTransition: boolean = false) {
    if (innerRef.current) {
      innerRef.current.style.transition = useTransition
        ? 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        : 'none';
      innerRef.current.style.transform = `translate3d(${positionRef.current.x}px, ${positionRef.current.y}px, 0) scale(${scaleRef.current})`;
    }
  }

  // Sincronizar scaleRef cuando el prop scale cambia (ej. desde los botones del visor)
  useEffect(() => {
    scaleRef.current = scale;
    updateTransform(true);
  }, [scale]);

  // Resetear posición y escala al cambiar de imagen/caso
  useEffect(() => {
    positionRef.current = { x: 0, y: 0 };
    scaleRef.current = 1;
    onScaleChange(1);
    updateTransform(false);
  }, [activeIndex, onScaleChange]);

  const obtenerLimites = (currentScale: number) => {
    if (!containerRef.current) return { maxX: 0, maxY: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    // Limitar el movimiento para que la imagen ampliada siempre cubra el centro
    const maxX = Math.max(0, (rect.width * currentScale - rect.width) / 2);
    const maxY = Math.max(0, (rect.height * currentScale - rect.height) / 2);
    return { maxX, maxY };
  };

  const handleWheel = (e: React.WheelEvent) => {
    const zoomFactor = 0.25;
    const direction = e.deltaY < 0 ? 1 : -1;
    const nextScale = Math.min(5, Math.max(1, scaleRef.current + direction * zoomFactor));

    scaleRef.current = nextScale;
    if (nextScale === 1) {
      positionRef.current = { x: 0, y: 0 };
    } else {
      const { maxX, maxY } = obtenerLimites(nextScale);
      positionRef.current = {
        x: Math.max(-maxX, Math.min(maxX, positionRef.current.x)),
        y: Math.max(-maxY, Math.min(maxY, positionRef.current.y)),
      };
    }
    onScaleChange(nextScale);
    updateTransform(true);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (scaleRef.current > 1) {
      scaleRef.current = 1;
      positionRef.current = { x: 0, y: 0 };
      onScaleChange(1);
      updateTransform(true);
    } else {
      scaleRef.current = 2.5;
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left - rect.width / 2;
        const clickY = e.clientY - rect.top - rect.height / 2;
        const { maxX, maxY } = obtenerLimites(2.5);
        positionRef.current = {
          x: Math.max(-maxX, Math.min(maxX, -clickX * 1.5)),
          y: Math.max(-maxY, Math.min(maxY, -clickY * 1.5)),
        };
      }
      onScaleChange(2.5);
      updateTransform(true);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    activePointers.current.push(e.nativeEvent);
    setNumActivePointers(activePointers.current.length);

    if (activePointers.current.length === 1) {
      isDragging.current = true;
      setIsDraggingState(true);
      dragStart.current = {
        x: e.clientX - positionRef.current.x,
        y: e.clientY - positionRef.current.y,
      };
    } else if (activePointers.current.length === 2) {
      isDragging.current = false;
      setIsDraggingState(false);
      const p1 = activePointers.current[0];
      const p2 = activePointers.current[1];
      initialPinchDistance.current = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY);
      initialScale.current = scaleRef.current;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const idx = activePointers.current.findIndex((p) => p.pointerId === e.pointerId);
    if (idx !== -1) {
      activePointers.current[idx] = e.nativeEvent;
    }

    if (isDragging.current && scaleRef.current > 1) {
      const newX = e.clientX - dragStart.current.x;
      const newY = e.clientY - dragStart.current.y;

      const { maxX, maxY } = obtenerLimites(scaleRef.current);
      positionRef.current = {
        x: Math.max(-maxX, Math.min(maxX, newX)),
        y: Math.max(-maxY, Math.min(maxY, newY)),
      };
      updateTransform(false); // Inyección de estilos directa (ultra fluido)
    } else if (activePointers.current.length === 2) {
      const p1 = activePointers.current[0];
      const p2 = activePointers.current[1];
      const currentDistance = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY);

      if (initialPinchDistance.current > 0) {
        const ratio = currentDistance / initialPinchDistance.current;
        const nextScale = Math.min(5, Math.max(1, initialScale.current * ratio));
        scaleRef.current = nextScale;
        onScaleChange(nextScale);

        if (nextScale === 1) {
          positionRef.current = { x: 0, y: 0 };
        } else {
          const { maxX, maxY } = obtenerLimites(nextScale);
          positionRef.current = {
            x: Math.max(-maxX, Math.min(maxX, positionRef.current.x)),
            y: Math.max(-maxY, Math.min(maxY, positionRef.current.y)),
          };
        }
        updateTransform(false);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const target = e.currentTarget as HTMLElement;
    try {
      target.releasePointerCapture(e.pointerId);
    } catch {
      // Ignorar errores de captura
    }
    activePointers.current = activePointers.current.filter((p) => p.pointerId !== e.pointerId);
    setNumActivePointers(activePointers.current.length);

    if (activePointers.current.length < 2) {
      initialPinchDistance.current = 0;
    }
    if (activePointers.current.length === 0) {
      isDragging.current = false;
      setIsDraggingState(false);
      updateTransform(true); // Suavizar al soltar
    } else if (activePointers.current.length === 1) {
      const activePointer = activePointers.current[0];
      isDragging.current = true;
      setIsDraggingState(true);
      dragStart.current = {
        x: activePointer.clientX - positionRef.current.x,
        y: activePointer.clientY - positionRef.current.y,
      };
    }
  };

  return (
    <div
      ref={containerRef}
      onDoubleClick={handleDoubleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`w-full h-full overflow-hidden flex items-center justify-center select-none ${
        scale > 1 ? 'cursor-grab' : ''
      } ${isDraggingState ? 'cursor-grabbing' : ''}`}
      style={{ touchAction: 'none' }}
      onWheel={handleWheel}
    >
      <div
        ref={innerRef}
        style={{
          transformOrigin: 'center center',
          willChange: 'transform',
        }}
        className="w-full h-full flex items-center justify-center"
      >
        {children}
      </div>
    </div>
  );
}

export const SuccessCases = ({ showcaseData }: SuccessCasesProps) => {
  const [visorAbierto, setVisorAbierto] = useState(false);
  const [escalaZoom, setEscalaZoom] = useState(1);
  const [dynamicCases, setDynamicCases] = useState<SuccessCase[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  // Dirección de la última navegación (1 = siguiente, -1 = anterior): orienta la animación
  const [direction, setDirection] = useState<1 | -1>(1);
  // Desplazamiento horizontal mientras el dedo arrastra la tarjeta (la sigue en tiempo real)
  const [dragX, setDragX] = useState(0);

  // ── Navegación entre casos ─────────────────────────────────────────────
  const irAlAnterior = useCallback(() => {
    setDirection(-1);
    setActiveIndex((prev) => (prev === 0 ? dynamicCases.length - 1 : prev - 1));
  }, [dynamicCases.length]);

  const irAlSiguiente = useCallback(() => {
    setDirection(1);
    setActiveIndex((prev) => (prev === dynamicCases.length - 1 ? 0 : prev + 1));
  }, [dynamicCases.length]);

  const irAlCaso = (idx: number) => {
    setDirection(idx >= activeIndex ? 1 : -1);
    setActiveIndex(idx);
  };

  // Teclado: flechas izquierda/derecha
  useEffect(() => {
    if (dynamicCases.length <= 1) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') irAlAnterior();
      if (e.key === 'ArrowRight') irAlSiguiente();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dynamicCases.length, irAlAnterior, irAlSiguiente]);

  // ── Swipe táctil entre casos: la tarjeta sigue al dedo ─────────────────
  // [2026-09-24] Antes: salto al soltar si el desplazamiento superaba 50 px, y arrastrar la manija
  // antes/después también contaba como swipe (saltaba de caso al comparar). Ahora se ignora el gesto
  // que empieza en la manija, se bloquea el eje (vertical = scroll de la página) y la tarjeta se
  // mueve con el dedo; al soltar pasa de caso o vuelve a su sitio.
  const swipe = useRef<{ x: number; y: number; axis: 'x' | 'y' | null } | null>(null);
  const handleSwipeStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('[data-slider-handle]') || dynamicCases.length < 2) {
      swipe.current = null;
      return;
    }
    swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, axis: null };
  };
  const handleSwipeMove = (e: React.TouchEvent) => {
    const s = swipe.current;
    if (!s) return;
    const dx = e.touches[0].clientX - s.x;
    const dy = e.touches[0].clientY - s.y;
    if (!s.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 8) {
      s.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (s.axis === 'x') setDragX(dx);
  };
  const handleSwipeEnd = () => {
    const s = swipe.current;
    swipe.current = null;
    if (!s || s.axis !== 'x') return;
    if (Math.abs(dragX) > SWIPE_THRESHOLD) {
      if (dragX < 0) irAlSiguiente();
      else irAlAnterior();
      Haptics.impact();
    }
    setDragX(0);
  };

  // ── Precarga de los casos vecinos (sin parpadeo al deslizar) ───────────
  const vecinos =
    dynamicCases.length > 1
      ? [
          dynamicCases[(activeIndex + 1) % dynamicCases.length],
          dynamicCases[(activeIndex - 1 + dynamicCases.length) % dynamicCases.length],
        ]
      : [];

  // ── Visor a pantalla completa: "atrás" del teléfono, Escape y scroll bloqueado ──
  const abrirVisor = () => {
    setEscalaZoom(1);
    setVisorAbierto(true);
    // Entrada propia en el historial: el gesto/botón "atrás" de Android cierra el visor
    // en vez de sacar al ciudadano de la página.
    window.history.pushState({ ...window.history.state, visorCasos: true }, '');
  };
  const cerrarVisor = useCallback(() => {
    if (window.history.state?.visorCasos)
      window.history.back(); // popstate lo cierra
    else setVisorAbierto(false);
  }, []);

  useEffect(() => {
    if (!visorAbierto) return;
    const onPopState = () => setVisorAbierto(false);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrarVisor();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('popstate', onPopState);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [visorAbierto, cerrarVisor]);
  /** isLoading: true mientras el fetch no ha completado (éxito o error) */
  const [isLoading, setIsLoading] = useState(true);

  const sectionRef = useRef<HTMLElement>(null);
  /**
   * hasFetched: bandera para garantizar idempotencia — el Observer puede
   * disparar múltiples veces si el usuario hace scroll rápido; solo queremos
   * un fetch en todo el ciclo de vida del componente.
   */
  const hasFetched = useRef(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    // IntersectionObserver con rootMargin de 200px: la imagen se pre-carga
    // 200px antes de entrar al viewport (invisible para el usuario).
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasFetched.current) {
          hasFetched.current = true;
          observer.disconnect(); // Un solo disparo — desconectar inmediatamente

          fetch('/api/gallery')
            .then((res) => res.json())
            .then(({ cases }) => {
              if (Array.isArray(cases) && cases.length > 0) {
                setDynamicCases(cases);
              } else if (showcaseData.beforeImageUrl && showcaseData.afterImageUrl) {
                setDynamicCases([
                  {
                    id: 'static-0',
                    title: 'Caso de Demostración (Simulado)',
                    beforeImageUrl: showcaseData.beforeImageUrl,
                    afterImageUrl: showcaseData.afterImageUrl,
                    createdAt: new Date().toISOString(),
                  },
                ]);
              }
            })
            .catch((err) => Sentry.captureException(err))
            .finally(() => setIsLoading(false));
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [showcaseData.beforeImageUrl, showcaseData.afterImageUrl]);

  const currentBefore =
    dynamicCases.length > 0
      ? dynamicCases[activeIndex].beforeImageUrl
      : showcaseData.beforeImageUrl;
  const currentAfter =
    dynamicCases.length > 0 ? dynamicCases[activeIndex].afterImageUrl : showcaseData.afterImageUrl;

  const hayImagenes = currentBefore && currentAfter;

  const ajustarZoom = (delta: number) => {
    setEscalaZoom((prev) => Math.min(4, Math.max(1, prev + delta)));
  };

  return (
    <LazyMotion features={domAnimation}>
      <section
        ref={sectionRef}
        className="py-16 md:py-24 px-4 relative"
        aria-label="Casos de éxito verificados"
      >
        <div className="max-w-4xl mx-auto text-center space-y-16">
          {/* Encabezado */}
          <div className="space-y-4">
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-black text-foreground tracking-tighter text-balance">
              Nuestros <span className="text-primary italic">Casos de Éxito</span>
            </h2>
            <div className="flex flex-col items-center gap-2">
              <div className="text-5xl md:text-8xl lg:text-[7rem] font-black text-foreground tracking-tighter drop-shadow-sm">
                {(() => {
                  const rawVal = showcaseData.counterValue || '1800+';
                  const numVal = parseInt(rawVal.replace(/[^0-9]/g, ''), 10) || 0;
                  const hasPlus = rawVal.includes('+');
                  return numVal > 0 ? (
                    <>
                      <CountUp from={0} to={numVal} separator="," duration={1.5} />
                      {hasPlus && '+'}
                    </>
                  ) : (
                    rawVal
                  );
                })()}
              </div>
              <div className="text-sm md:text-base font-black uppercase tracking-[0.3em] text-primary">
                {showcaseData.counterLabel || 'Sanciones Eliminadas'}
              </div>
            </div>
            <p className="text-lg md:text-xl text-muted-foreground font-medium max-w-2xl mx-auto reveal reveal-delay-1">
              Transparencia total. Desliza la barra para comparar la reducción de las deudas en
              SIMIT reales procesados por nosotros.
            </p>
          </div>

          {/* Galería Premium */}
          {isLoading ? (
            /* Skeleton — se muestra mientras el IntersectionObserver aún no disparó
             * o mientras el fetch está en vuelo. */
            <SkeletonSlider />
          ) : hayImagenes ? (
            <div className="space-y-4">
              {/* Contador de casos */}
              {dynamicCases.length > 1 && (
                <div className="flex items-center justify-center gap-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Caso {activeIndex + 1} de {dynamicCases.length}
                  </span>
                </div>
              )}

              {/* Slider con flechas y swipe */}
              <div
                className="relative p-2 md:p-3 rounded-[2.5rem] bg-gradient-to-br from-primary/10 via-background to-background shadow-inner border border-primary/10"
                onTouchStart={handleSwipeStart}
                onTouchMove={handleSwipeMove}
                onTouchEnd={handleSwipeEnd}
                onTouchCancel={handleSwipeEnd}
              >
                {/* Flecha izquierda */}
                {dynamicCases.length > 1 && (
                  <button
                    onClick={irAlAnterior}
                    className="absolute left-2 md:left-0 top-1/2 -translate-y-1/2 md:-translate-x-6 z-20 w-10 h-10 rounded-full bg-background/90 border border-border shadow-lg flex items-center justify-center hover:bg-primary/10 hover:border-primary/30 transition-all active:scale-90"
                    aria-label="Caso anterior"
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </button>
                )}

                <div className="bg-card/40 shadow-2xl rounded-[2rem] overflow-hidden border border-white/5 relative group flex items-center justify-center">
                  {/* Texto de marca de agua en el fondo (visible durante la transición) */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
                    <span className="text-4xl md:text-7xl font-black uppercase tracking-[0.25em] text-foreground/5 dark:text-white/5 animate-pulse">
                      Desmulta
                    </span>
                  </div>

                  {/* Título del caso activo */}
                  {dynamicCases[activeIndex]?.title && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-full pointer-events-none">
                      <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-white/90">
                        {dynamicCases[activeIndex].title}
                      </span>
                    </div>
                  )}
                  {/* La tarjeta sigue al dedo mientras se arrastra; al soltar vuelve con transición */}
                  <div
                    className="w-full h-full z-10 relative"
                    style={{
                      transform: `translateX(${dragX}px)`,
                      transition: dragX === 0 ? 'transform 0.25s ease-out' : 'none',
                    }}
                  >
                    <AnimatePresence mode="wait" custom={direction}>
                      <m.div
                        key={dynamicCases[activeIndex]?.id || activeIndex}
                        custom={direction}
                        variants={{
                          enter: (dir: number) => ({ opacity: 0, x: dir * 48 }),
                          center: { opacity: 1, x: 0 },
                          exit: (dir: number) => ({ opacity: 0, x: dir * -48 }),
                        }}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                        className="w-full h-full relative"
                      >
                        <ImageSlider
                          beforeSrc={currentBefore}
                          afterSrc={currentAfter}
                          onExpand={abrirVisor}
                        />
                      </m.div>
                    </AnimatePresence>
                  </div>
                </div>

                {/* Flecha derecha */}
                {dynamicCases.length > 1 && (
                  <button
                    onClick={irAlSiguiente}
                    className="absolute right-2 md:right-0 top-1/2 -translate-y-1/2 md:translate-x-6 z-20 w-10 h-10 rounded-full bg-background/90 border border-border shadow-lg flex items-center justify-center hover:bg-primary/10 hover:border-primary/30 transition-all active:scale-90"
                    aria-label="Caso siguiente"
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Puntos indicadores (más limpios que los botones de texto) */}
              {dynamicCases.length > 1 && (
                <div className="flex justify-center gap-2 mt-2">
                  {dynamicCases.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        irAlCaso(idx);
                        Haptics.impact();
                      }}
                      className={`rounded-full transition-all duration-300 ${
                        idx === activeIndex
                          ? 'w-6 h-2 bg-primary'
                          : 'w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/60'
                      }`}
                      aria-label={`Ir al caso ${idx + 1}`}
                      aria-current={idx === activeIndex ? 'true' : undefined}
                    />
                  ))}
                </div>
              )}

              {/* Precarga invisible de los casos vecinos: mismas `sizes` que el visor, así el
                  navegador descarga la misma variante y al deslizar la foto ya está en caché. */}
              {vecinos.length > 0 && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
                >
                  {vecinos.flatMap((caso) => [
                    <div key={`${caso.id}-a`} className="relative h-px w-px">
                      <Image src={caso.afterImageUrl} alt="" fill sizes={IMAGE_SIZES_INLINE} />
                    </div>,
                    <div key={`${caso.id}-b`} className="relative h-px w-px">
                      <Image src={caso.beforeImageUrl} alt="" fill sizes={IMAGE_SIZES_INLINE} />
                    </div>,
                  ])}
                </div>
              )}

              <p className="text-[10px] md:text-[11px] text-muted-foreground/60 italic mt-4 max-w-md mx-auto text-center leading-relaxed">
                * Nota: Las imágenes y valores presentados corresponden a casos reales procesados
                por nuestra plataforma, con la información personal debidamente protegida y oculta
                para garantizar la estricta confidencialidad de los ciudadanos.
              </p>
            </div>
          ) : (
            /* Sin imágenes ni en Firestore ni en los valores por defecto */
            <div className="relative group p-4 rounded-[4rem] bg-gradient-to-br from-primary/30 via-primary/5 to-transparent shadow-inner opacity-50">
              <div className="bg-card/80 backdrop-blur-md overflow-hidden p-3 shadow-2xl border-white/10 rounded-[3.5rem]">
                <div className="aspect-[16/9] relative rounded-[3rem] overflow-hidden flex items-center justify-center bg-muted/20">
                  <p className="font-bold text-muted-foreground p-12 text-center">
                    Los casos de éxito estarán disponibles próximamente.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
         * MODAL GLASSMORPHISM: VISOR PANTALLA COMPLETA v7.4.3
         * React Portal: Evita quedar atrapado en Stacking Contexts (Z-Index)
         * para flotar nativamente sobre el Header y los botones flotantes.
         * ═══════════════════════════════════════════════════════════════════ */}
        {typeof document !== 'undefined' &&
          createPortal(
            <AnimatePresence>
              {visorAbierto && (
                <m.div
                  initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                  animate={{ opacity: 1, backdropFilter: 'blur(24px)' }}
                  exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                  transition={{ duration: 0.3 }}
                  className="fixed inset-0 z-[999999] bg-black/80 flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Visor de casos de éxito"
                >
                  {/* Toolbar Superior Glass */}
                  <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-white/10 bg-black/40 shrink-0 z-50">
                    <div className="flex flex-col">
                      <span className="text-[10px] md:text-xs font-black tracking-[0.2em] uppercase text-white/70">
                        Evidencia de Condonación
                      </span>
                      {dynamicCases.length > 1 && (
                        <span className="text-[11px] font-semibold text-white/50 tabular-nums">
                          Caso {activeIndex + 1} de {dynamicCases.length}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2 items-center">
                      <button
                        onClick={() => ajustarZoom(-0.5)}
                        disabled={escalaZoom <= 1}
                        aria-label="Alejar"
                        className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-all flex items-center justify-center text-white"
                      >
                        <ZoomOut className="w-5 h-5" />
                      </button>
                      <span className="text-xs font-bold text-white w-12 text-center tabular-nums">
                        {Math.round(escalaZoom * 100)}%
                      </span>
                      <button
                        onClick={() => ajustarZoom(0.5)}
                        disabled={escalaZoom >= 4}
                        aria-label="Acercar"
                        className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-all flex items-center justify-center text-white mr-2"
                      >
                        <ZoomIn className="w-5 h-5" />
                      </button>

                      <button
                        onClick={cerrarVisor}
                        aria-label="Cerrar visor"
                        className="w-10 h-10 rounded-full bg-red-500/20 hover:bg-red-500/50 transition-all flex items-center justify-center text-white ml-2"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Contenedor del Slider en FullScreen */}
                  <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4">
                    <m.div
                      className="w-full max-w-5xl h-full relative"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    >
                      <ZoomPanContainer
                        scale={escalaZoom}
                        onScaleChange={setEscalaZoom}
                        activeIndex={activeIndex}
                      >
                        <ImageSlider
                          key={`fullscreen-${dynamicCases[activeIndex]?.id || activeIndex}`}
                          beforeSrc={currentBefore}
                          afterSrc={currentAfter}
                          isExpanded={true}
                          zoomScale={1}
                        />
                      </ZoomPanContainer>
                    </m.div>
                  </div>

                  {/* Pasar de caso dentro del visor (ocultas con zoom para no chocar con el arrastre) */}
                  {dynamicCases.length > 1 && escalaZoom === 1 && (
                    <>
                      <button
                        onClick={() => {
                          irAlAnterior();
                          Haptics.impact();
                        }}
                        aria-label="Caso anterior"
                        className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-50 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md flex items-center justify-center text-white transition-all active:scale-90"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button
                        onClick={() => {
                          irAlSiguiente();
                          Haptics.impact();
                        }}
                        aria-label="Caso siguiente"
                        className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-50 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md flex items-center justify-center text-white transition-all active:scale-90"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </>
                  )}

                  {/* Helper footer */}
                  <div className="absolute bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 px-6 py-2 bg-black/60 backdrop-blur-xl border border-white/20 rounded-full pointer-events-none">
                    <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-emerald-400">
                      Desliza la barra central
                    </span>
                  </div>
                </m.div>
              )}
            </AnimatePresence>,
            document.body
          )}
      </section>
    </LazyMotion>
  );
};
