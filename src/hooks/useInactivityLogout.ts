import { useEffect, useRef, useCallback } from 'react';

/** Eventos de actividad que reinician el temporizador */
const ACTIVITY_EVENTS = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
  'click',
] as const;

interface UseInactivityLogoutOptions {
  /** Tiempo de inactividad en ms antes del logout. Default: 30 min */
  timeoutMs?: number;
  /** Callback invocado cuando el usuario es advertido (60s antes del logout) */
  onWarning?: () => void;
  /** Callback invocado al ejecutar el logout */
  onLogout: () => void;
  /** Si es false, el hook queda desactivado (ej. usuario no autenticado) */
  enabled: boolean;
}

/**
 * Hook de seguridad: Auto-logout por inactividad de sesión admin.
 *
 * MANDATO-FILTRO v8.9.4 — Timeout de Sesión:
 * - Detecta actividad via eventos del DOM (mouse, teclado, scroll, touch).
 * - Emite onWarning 60 segundos antes del cierre para dar contexto al usuario.
 * - Invoca onLogout tras el período de inactividad configurado.
 * - Limpia todos los timers correctamente al desmontar.
 *
 * @param options - Configuración del timeout y callbacks.
 */
export function useInactivityLogout({
  timeoutMs = 5 * 60 * 1000, // 5 minutos por defecto
  onWarning,
  onLogout,
  enabled,
}: UseInactivityLogoutOptions): void {
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onLogoutRef = useRef(onLogout);
  const onWarningRef = useRef(onWarning);

  // Mantener refs actualizadas sin re-registrar listeners
  useEffect(() => {
    onLogoutRef.current = onLogout;
  }, [onLogout]);

  useEffect(() => {
    onWarningRef.current = onWarning;
  }, [onWarning]);

  const clearTimers = useCallback(() => {
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
  }, []);

  const resetTimers = useCallback(() => {
    clearTimers();

    const warningDelay = timeoutMs - 60_000; // Advertencia 60s antes

    if (warningDelay > 0 && onWarningRef.current) {
      warningTimerRef.current = setTimeout(() => {
        onWarningRef.current?.();
      }, warningDelay);
    }

    logoutTimerRef.current = setTimeout(() => {
      onLogoutRef.current();
    }, timeoutMs);
  }, [timeoutMs, clearTimers]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      return;
    }

    // Arrancar timers al activarse
    resetTimers();

    // Re-iniciar timers en cada evento de actividad del usuario
    const handler = () => resetTimers();

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handler, { passive: true });
    });

    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handler);
      });
    };
  }, [enabled, resetTimers, clearTimers]);
}
