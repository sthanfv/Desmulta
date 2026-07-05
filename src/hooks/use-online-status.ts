'use client';

/**
 * useOnlineStatus — Hook para detectar en tiempo real si el operador tiene conexión a internet.
 *
 * Funciona escuchando los eventos nativos del navegador 'online' y 'offline'.
 * El campo `wasOffline` permite mostrar un mensaje de "¡Conexión restaurada!" cuando
 * el operador recupera la señal después de haber estado sin internet.
 *
 * Uso:
 *   const { isOnline, wasOffline } = useOnlineStatus();
 */

import { useState, useEffect, useRef } from 'react';

export interface OnlineStatusResult {
  /** true si el navegador reporta conexión activa */
  isOnline: boolean;
  /** true si el operador estuvo offline y acaba de reconectarse en esta sesión */
  wasOffline: boolean;
}

export function useOnlineStatus(): OnlineStatusResult {
  // Inicializar con el estado real del navegador (fallback a true en SSR)
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState(false);
  // Ref para limpiar el timer de "wasOffline" correctamente y evitar memory leaks
  const wasOfflineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(true);
      // Limpiar timer previo si existe (reconexión rápida o múltiple)
      if (wasOfflineTimerRef.current) clearTimeout(wasOfflineTimerRef.current);
      wasOfflineTimerRef.current = setTimeout(() => {
        setWasOffline(false);
        wasOfflineTimerRef.current = null;
      }, 5000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      // Si se va offline de nuevo, cancelar el timer de "restaurado"
      if (wasOfflineTimerRef.current) {
        clearTimeout(wasOfflineTimerRef.current);
        wasOfflineTimerRef.current = null;
      }
      setWasOffline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      // Limpiar timer pendiente al desmontar el componente (evitar memory leak)
      if (wasOfflineTimerRef.current) clearTimeout(wasOfflineTimerRef.current);
    };
  }, []);

  return { isOnline, wasOffline };
}
