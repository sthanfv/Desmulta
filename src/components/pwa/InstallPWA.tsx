'use client';
import { logger } from '@/lib/logger/security-logger';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * InstallPWA — Gestor de instalación de la aplicación.
 * MANDATO-FILTRO v7.7.3: Mantiene la lógica de detección pero retorna null
 * para evitar banners intrusivos en la experiencia AMOLED premium.
 */
export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const lastDismissed = localStorage.getItem('pwa-prompt-dismissed');
    const isDismissedRecently =
      lastDismissed && Date.now() - parseInt(lastDismissed) < 1000 * 60 * 60 * 24;

    const handler = (e: Event) => {
      if (isDismissedRecently) return;
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      // Ya instalada
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Nota: Las funciones handleDismiss y handleInstallClick se omiten
  // al no renderizar interfaz visual en esta versión.

  // Para debugging en consola si fuera necesario
  if (deferredPrompt) {
    // logger.info('PWA: Instalación disponible');
  }

  return null;
}
