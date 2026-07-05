'use client';

/**
 * OfflineBanner — Indicador visual de estado de conexión para el panel de administración.
 *
 * Comportamiento:
 * - Sin internet: Aparece banner rojo/ámbar fijo en la parte superior con animación slide-down.
 * - Al reconectar: Cambia a banner verde "Conexión restaurada" durante 5 segundos, luego desaparece.
 * - Online normal: Invisible (no ocupa espacio).
 *
 * Incluye: Indicador de cambios pendientes en la cola de sincronización offline.
 */

import { useEffect, useState } from 'react';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { getSyncQueue } from '@/lib/pwa/sync-queue';
import { WifiOff, Wifi, AlertTriangle } from 'lucide-react';

export function OfflineBanner() {
  const { isOnline, wasOffline } = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [visible, setVisible] = useState(false);

  // Verificar cola de sincronización pendiente
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkQueue = async () => {
      try {
        const queue = await getSyncQueue();
        setPendingCount(queue.length);
      } catch {
        setPendingCount(0);
      }
    };

    checkQueue();
    // Revisar cada 10 segundos si hay cambios pendientes
    const interval = setInterval(checkQueue, 10_000);
    return () => clearInterval(interval);
  }, [isOnline]);

  // Controlar visibilidad con transición suave
  useEffect(() => {
    if (!isOnline || wasOffline) {
      setVisible(true);
    } else {
      // Pequeño delay antes de ocultar para permitir la animación de salida
      const timer = setTimeout(() => setVisible(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (!visible) return null;

  // Estado: Reconectado
  if (isOnline && wasOffline) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-0 left-0 right-0 z-[99999] flex items-center justify-center gap-3 bg-emerald-600 px-4 py-2.5 text-white text-sm font-semibold shadow-lg animate-in slide-in-from-top-2 duration-300"
      >
        <Wifi className="h-4 w-4 shrink-0" />
        <span>✓ Conexión restaurada. Sincronizando cambios automáticamente...</span>
      </div>
    );
  }

  // Estado: Sin conexión
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-0 left-0 right-0 z-[99999] flex items-center justify-center gap-3 bg-amber-600/95 backdrop-blur-sm px-4 py-2.5 text-white text-sm font-semibold shadow-lg animate-in slide-in-from-top-2 duration-300"
    >
      <WifiOff className="h-4 w-4 shrink-0 animate-pulse" />
      <span>
        Modo Offline — Trabajando en local.
        {pendingCount > 0 && (
          <span className="ml-2 inline-flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5 text-xs font-bold">
            <AlertTriangle className="h-3 w-3" />
            {pendingCount} cambio{pendingCount !== 1 ? 's' : ''} pendiente
            {pendingCount !== 1 ? 's' : ''}
          </span>
        )}
      </span>
      <span className="ml-auto text-xs font-normal opacity-80">
        Los cambios se guardarán al reconectar
      </span>
    </div>
  );
}
