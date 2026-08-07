'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { Clock, X } from 'lucide-react';

interface RateLimitBannerProps {
  /**
   * Segundos que quedan cuando el banner aparece.
   * Se pasa el valor del header Retry-After (segundos) o se calcula desde
   * el campo `reset` (ms) del body de la respuesta 429.
   */
  secondsRemaining: number;
  /** Mensaje de texto del servidor (ya tiene "espera N minutos…") */
  message?: string;
  /** Llamado cuando el countdown llega a 0 */
  onExpire?: () => void;
  /** Llamado al cerrar manualmente */
  onDismiss?: () => void;
}

/**
 * Banner inline de rate-limit con countdown en tiempo real.
 *
 * — En móvil: aparece pegado a la barra de progreso del formulario,
 *   encima de los campos, bien visible antes de hacer scroll.
 * — En desktop: idem, pero con más breathing room horizontal.
 *
 * Diseño:
 *   - Fondo ambar suave (semantic warning), borde izquierdo sólido
 *   - Ícono de reloj animado + texto + countdown grande
 *   - Barra de progreso que se vacía en tiempo real
 *   - Botón X para cerrar (aunque el botón de submit sigue bloqueado hasta 0)
 */
export function RateLimitBanner({
  secondsRemaining,
  message,
  onExpire,
  onDismiss,
}: RateLimitBannerProps) {
  const [secsLeft, setSecsLeft] = useState(Math.max(0, secondsRemaining));
  const total = secondsRemaining;

  useEffect(() => {
    setSecsLeft(Math.max(0, secondsRemaining));
  }, [secondsRemaining]);

  useEffect(() => {
    if (secsLeft <= 0) {
      onExpire?.();
      return;
    }
    const timer = setInterval(() => {
      setSecsLeft((s) => {
        const next = s - 1;
        if (next <= 0) {
          clearInterval(timer);
          onExpire?.();
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [secsLeft, onExpire]);

  const hours = Math.floor(secsLeft / 3600);
  const mins = Math.floor((secsLeft % 3600) / 60);
  const secs = secsLeft % 60;
  
  let timeDisplay = '';
  if (hours > 0) {
    timeDisplay = `${hours}h ${String(mins).padStart(2, '0')}m`;
  } else if (mins > 0) {
    timeDisplay = `${mins}:${String(secs).padStart(2, '0')}`;
  } else {
    timeDisplay = `${secs}s`;
  }

  const progressPct = total > 0 ? (secsLeft / total) * 100 : 0;

  if (secsLeft <= 0) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="
        relative overflow-hidden
        rounded-xl border border-amber-300/60 dark:border-amber-500/30
        bg-amber-50 dark:bg-amber-950/30
        px-4 py-3.5
        flex items-start gap-3
        shadow-sm
      "
    >
      {/* Barra de progreso (fondo, se vacía) */}
      <div
        className="absolute inset-x-0 bottom-0 h-0.5 bg-amber-200/70 dark:bg-amber-700/40"
        aria-hidden="true"
      >
        <div
          className="h-full bg-amber-400 dark:bg-amber-500 transition-all duration-1000 ease-linear"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Ícono */}
      <div className="flex-shrink-0 mt-0.5">
        <Clock size={18} className="text-amber-600 dark:text-amber-400" aria-hidden="true" />
      </div>

      {/* Texto */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 leading-snug">
          Pausa de seguridad activa
        </p>
        <p className="text-xs text-amber-700/80 dark:text-amber-300/70 mt-0.5 leading-relaxed">
          {message
            ? message.replace(/espera.*?antes/i, 'espera antes')
            : 'Por favor espera antes de enviar otra consulta.'}
        </p>
      </div>

      {/* Countdown */}
      <div className="flex-shrink-0 flex flex-col items-end gap-1">
        <span
          className="
            font-mono text-lg font-bold tabular-nums
            text-amber-700 dark:text-amber-300
            min-w-[3ch] text-right
          "
          aria-label={`Tiempo restante: ${timeDisplay}`}
        >
          {timeDisplay}
        </span>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-amber-500/60 hover:text-amber-600 dark:hover:text-amber-400 transition-colors -mr-0.5"
            aria-label="Cerrar aviso"
          >
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Utilidad de parseo ───────────────────────────────────────────────────────

/**
 * Parsea una respuesta 429 del servidor y extrae los segundos de espera.
 *
 * Primero intenta leer el header `Retry-After` (número de segundos).
 * Como fallback, extrae el número del mensaje de texto (p.ej. "espera 3 minutos").
 */
export function parseRetryAfter(response: Response, bodyMessage?: string): number {
  // Intento 1: Header Retry-After (más preciso)
  const retryHeader = response.headers.get('Retry-After');
  if (retryHeader) {
    const secs = parseInt(retryHeader, 10);
    if (!isNaN(secs) && secs > 0) return secs;
  }

  // Intento 2: Extraer de texto como "espera 3 minutos y 20 segundos"
  if (bodyMessage) {
    const minsMatch = bodyMessage.match(/(\d+)\s*minuto/)?.[1];
    const secsMatch = bodyMessage.match(/(\d+)\s*segundo/)?.[1];
    const totalSecs =
      (minsMatch ? parseInt(minsMatch) * 60 : 0) + (secsMatch ? parseInt(secsMatch) : 0);
    if (totalSecs > 0) return totalSecs;
  }

  // Fallback conservador
  return 300; // 5 minutos
}

// ─── useRateLimit hook ────────────────────────────────────────────────────────

interface RateLimitState {
  active: boolean;
  secondsRemaining: number;
  message: string;
}

/**
 * Hook que gestiona el estado de rate-limit para un formulario.
 *
 * Uso:
 *   const { rateLimitState, handleRateLimitResponse, clearRateLimit } = useRateLimit();
 *
 *   // Cuando obtienes un response 429:
 *   if (response.status === 429) {
 *     handleRateLimitResponse(response, result.error);
 *     return;
 *   }
 */
export function useRateLimit() {
  const [rateLimitState, setRateLimitState] = useState<RateLimitState>({
    active: false,
    secondsRemaining: 0,
    message: '',
  });

  const handleRateLimitResponse = useCallback((response: Response, bodyMessage?: string) => {
    const secs = parseRetryAfter(response, bodyMessage);
    setRateLimitState({
      active: true,
      secondsRemaining: secs,
      message: bodyMessage || '',
    });
  }, []);

  const clearRateLimit = useCallback(() => {
    setRateLimitState({ active: false, secondsRemaining: 0, message: '' });
  }, []);

  return { rateLimitState, handleRateLimitResponse, clearRateLimit };
}
