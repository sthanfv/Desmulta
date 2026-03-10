'use client';

import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

/**
 * PwaUpdateToast - Escucha eventos del Service Worker para notificar actualizaciones.
 * MANDATO-FILTRO: Mejora la UX y asegura que el usuario tenga la versión más segura.
 */
export function PwaUpdateToast() {
  const { toast } = useToast();
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const handleUpdate = useCallback(() => {
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  }, [registration]);

  const showUpdateToast = useCallback(() => {
    toast({
      title: 'Nueva versión disponible',
      description:
        'Una actualización importante ha sido detectada para mejorar la seguridad y el rendimiento.',
      action: (
        <Button
          variant="default"
          size="sm"
          onClick={handleUpdate}
          className="bg-primary text-primary-foreground gap-2 font-bold"
        >
          <RefreshCw size={14} />
          ACTUALIZAR
        </Button>
      ),
      duration: 10000,
    });
  }, [toast, handleUpdate]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) {
          setRegistration(reg);

          // Escuchar si hay una actualización esperando
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  showUpdateToast();
                }
              });
            }
          });
        }
      });
    }
  }, [showUpdateToast]);

  return null;
}
