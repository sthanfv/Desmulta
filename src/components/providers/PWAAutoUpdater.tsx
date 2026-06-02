'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { healPwaCache } from '@/lib/utils/pwa-heal';
import * as Sentry from '@sentry/nextjs';

/**
 * PWAAutoUpdater — El "Cerebro en Segundo Plano" de Zero-Stale Protocol
 * Se asegura de que la aplicación nunca se quede bloqueada en una versión antigua.
 */
export function PWAAutoUpdater() {
  const router = useRouter();
  const lastActiveRef = useRef<number>(Date.now());

  useEffect(() => {
    // -------------------------------------------------------------------------
    // 1. Detección de Inactividad (Visibility Change)
    // -------------------------------------------------------------------------
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        const hoursInactive = (now - lastActiveRef.current) / 1000 / 60 / 60;

        if (hoursInactive >= 2) {
          console.log(
            '[PWAAutoUpdater] Tab inactiva por más de 2h. Forzando revalidación suave...'
          );
          router.refresh();
        }
        lastActiveRef.current = now;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // -------------------------------------------------------------------------
    // 2. Detección de Service Worker Zombie (Nuevas versiones de PWA)
    // -------------------------------------------------------------------------
    let swRegistration: ServiceWorkerRegistration | undefined;

    const setupSWListener = async () => {
      if ('serviceWorker' in navigator) {
        try {
          // BARRERA ANTI-BUCLE: Usamos una cookie porque healPwaCache destruye el sessionStorage
          if (document.cookie.includes('pwa_healed=true')) {
            console.info(
              '[PWAAutoUpdater] 🛡️ App recién sanada. Bloqueando detecciones recursivas.'
            );
            return; // La cookie expira sola en 30 segundos, no necesitamos setTimeout
          }

          swRegistration = await navigator.serviceWorker.ready;

          swRegistration.addEventListener('updatefound', () => {
            const newWorker = swRegistration?.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.warn(
                    '[PWAAutoUpdater] ¡Nueva versión de la app detectada! Iniciando Auto-Sanación...'
                  );
                  // Inyectamos la cookie con 30 segundos de vida (max-age=30)
                  document.cookie = 'pwa_healed=true; max-age=30; path=/';
                  healPwaCache();
                }
              });
            }
          });
        } catch {
          // Ignorar si falla el SW localmente
        }
      }
    };

    setupSWListener();

    // -------------------------------------------------------------------------
    // 3. Interceptor de ChunkLoadError (Falla de Scripts)
    // -------------------------------------------------------------------------
    const handleGlobalError = (event: ErrorEvent | PromiseRejectionEvent) => {
      const errorMsg = 'error' in event ? event.error?.message : event.reason?.message;
      if (typeof errorMsg === 'string') {
        const isChunkError =
          errorMsg.toLowerCase().includes('chunk') ||
          errorMsg.toLowerCase().includes('dynamically imported module') ||
          errorMsg.toLowerCase().includes('failed to fetch dynamically imported module');

        if (isChunkError) {
          console.error('🚨 [PWAAutoUpdater] ChunkLoadError detectado. Auto-sanando aplicación...');
          Sentry.captureMessage('PWAAutoUpdater interceptó ChunkLoadError y ejecutó healPwaCache');

          // Barrera también aquí para evitar bucle por error de importación
          if (!document.cookie.includes('pwa_healed=true')) {
            document.cookie = 'pwa_healed=true; max-age=30; path=/';
            healPwaCache();
          }
        }
      }
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleGlobalError);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleGlobalError);
    };
  }, [router]);

  return null;
}
