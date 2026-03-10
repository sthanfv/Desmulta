'use client';

import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    // MANDATO-FILTRO: Evitar molestias recurrentes.
    // Revisar si el usuario ya cerró el banner hoy.
    const lastDismissed = localStorage.getItem('pwa-prompt-dismissed');
    const isDismissedRecently =
      lastDismissed && Date.now() - parseInt(lastDismissed) < 1000 * 60 * 60 * 24; // 24 horas

    const handler = (e: Event) => {
      if (isDismissedRecently) return; // No asustar al usuario si ya lo cerró

      // Previene que el navegador muestre el prompt automático
      e.preventDefault();
      // Guarda el evento para dispararlo más tarde
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Muestra el botón de instalación profesional
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Opcional: Ocultar si ya está instalada (standalone)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallBtn(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
    setShowInstallBtn(false);
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Muestra el prompt de instalación nativo
    deferredPrompt.prompt();

    // Espera la respuesta del usuario
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      // Instalación aceptada - Silencio en producción según MANDATO-FILTRO
    }

    // Limpiamos el prompt guardado
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

  return (
    <AnimatePresence>
      {showInstallBtn && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-24 left-4 right-4 z-[100] md:left-auto md:right-8 md:bottom-8 md:w-80"
        >
          <div className="glass p-5 rounded-[2.5rem] border-primary/20 shadow-2xl flex flex-col gap-4 relative overflow-hidden group">
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                <Download size={24} />
              </div>
              <div>
                <h4 className="font-bold text-sm">Instalar App Oficial</h4>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
                  Experiencia Desmulta Elite
                </p>
              </div>
            </div>
            <Button
              onClick={handleInstallClick}
              className="w-full rounded-2xl bg-primary text-primary-foreground font-bold hover:scale-[1.02] active:scale-95 transition-all"
            >
              INSTALAR AHORA
            </Button>
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
