'use client';
import { logger } from '@/lib/logger/security-logger';

import { useEffect } from 'react';
import { getMessaging, onMessage, isSupported } from 'firebase/messaging';
import { app } from '@/lib/firebase-client';
import { toast } from '@/hooks/use-toast';

/**
 * PushProvider — Capa Global de Notificaciones en Primer Plano.
 *
 * Este componente actúa como centinela permanente de notificaciones Firebase
 * mientras el usuario navega por cualquier página de la aplicación.
 *
 * Resuelve el "Agujero Negro del Listener de Primer Plano":
 * cuando el navegador detecta que la web está activa, Firebase bloquea la
 * notificación nativa del SO. Sin este listener, el mensaje desaparece en el vacío.
 * Con este provider, siempre aparece un Toast visual que confirma la alerta.
 */
export function PushProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const iniciarListenerForeground = async () => {
      try {
        const soportado = await isSupported();
        if (!soportado || !('serviceWorker' in navigator)) return;

        if (Notification.permission !== 'granted') return;

        const messaging = getMessaging(app);

        unsubscribe = onMessage(messaging, (payload) => {
          const titulo = payload.notification?.title ?? '🔔 Desmulta';
          const cuerpo = payload.notification?.body ?? 'Tu expediente tiene novedades.';

          // Mostrar Toast global visible desde cualquier página
          toast({
            title: titulo,
            description: cuerpo,
            duration: 12000,
          });
        });
      } catch (err) {
        // Fallo silencioso — no bloquea la carga de la aplicación
        logger.warn('[PushProvider] No se pudo inicializar el listener de push:', err);
      }
    };

    iniciarListenerForeground();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return <>{children}</>;
}
