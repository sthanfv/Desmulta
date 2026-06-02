'use client';

import { useState, useCallback, useEffect } from 'react';
import { getMessaging, getToken, isSupported, deleteToken } from 'firebase/messaging';
import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase-client';
import { useToast } from './use-toast';

export function useWebPush() {
  const [isHandlingPermission, setIsHandlingPermission] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [yaTienePermiso, setYaTienePermiso] = useState(false);
  const [mostrarBannerPush, setMostrarBannerPush] = useState(false);
  const { toast } = useToast();

  // Al montar: registrar SW de Firebase incondicionalmente y restaurar token si hay permiso
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      !('serviceWorker' in navigator)
    )
      return;

    // Esperar a que el SW de next-pwa esté listo (sw.js ahora importa la lógica de Firebase)
    navigator.serviceWorker.ready
      .then((reg) => {
        if (process.env.NODE_ENV === 'development') {
          console.debug('[FCM SW] Service Worker listo:', reg.scope);
        }
      })
      .catch(() => {});

    const permisoActual = Notification.permission;
    if (permisoActual === 'granted' || permisoActual === 'denied') {
      setYaTienePermiso(true);

      if (permisoActual === 'granted') {
        isSupported().then(async (soportado) => {
          if (!soportado) return;
          try {
            const sw = await navigator.serviceWorker.ready;
            const messaging = getMessaging(app);
            const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

            // FIX: Verificar VAPID key antes de intentar obtener token
            if (!vapidKey) {
              console.error('[useWebPush] NEXT_PUBLIC_FIREBASE_VAPID_KEY no está configurada.');
              return;
            }

            const token = await getToken(messaging, {
              vapidKey,
              serviceWorkerRegistration: sw,
            });
            if (token) setFcmToken(token);
          } catch (err) {
            // FIX: No loggear el error completo en prod; puede contener info de config
            if (process.env.NODE_ENV === 'development') {
              console.error('[useWebPush] Error al restaurar token FCM:', err);
            }
          }
        });
      }
    }
  }, []);

  /**
   * mostrarBannerPushNotificacion — activa el banner no intrusivo.
   * Solo si el usuario aún no ha concedido o denegado.
   */
  const mostrarBannerPushNotificacion = useCallback(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const permiso = Notification.permission;
    if (permiso !== 'granted') {
      setMostrarBannerPush(true);
    }
  }, []);

  const cerrarBannerPush = useCallback(() => {
    setMostrarBannerPush(false);
    setYaTienePermiso(true);
  }, []);

  /**
   * requestNotificationPermission — solicita permiso, obtiene token FCM
   * y lo registra en Firestore vinculado al docId del expediente.
   */
  const requestNotificationPermission = useCallback(
    async (docId: string) => {
      setIsHandlingPermission(true);
      setMostrarBannerPush(false);
      try {
        const soportado = await isSupported();
        if (!soportado) {
          toast({
            title: 'Navegador no compatible',
            description: 'Tu navegador no admite notificaciones push.',
          });
          return null;
        }

        // FIX: Verificar VAPID key ANTES de solicitar permiso al usuario
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
          console.error('[useWebPush] NEXT_PUBLIC_FIREBASE_VAPID_KEY no configurada.');
          toast({
            variant: 'destructive',
            title: 'Error de Configuración',
            description:
              'El sistema de alertas no está configurado correctamente. Contacta soporte.',
          });
          return null;
        }

        let permiso = Notification.permission;
        if (permiso === 'default') {
          permiso = await Notification.requestPermission();
        }

        if (permiso !== 'granted') {
          toast({
            variant: 'destructive',
            title: permiso === 'denied' ? 'Bloqueado por el Navegador' : 'Notificaciones Omitidas',
            description:
              permiso === 'denied'
                ? 'Toca el candado 🔒 junto a desmulta.online en la barra de arriba y activa las notificaciones para que funcionen.'
                : 'No podremos notificarte el resultado en tiempo real.',
            duration: 8000,
          });
          setYaTienePermiso(true);
          return null;
        }

        setYaTienePermiso(true);

        if (!('serviceWorker' in navigator)) {
          throw new Error('Service Workers no soportados en este navegador.');
        }

        const registration = await navigator.serviceWorker.ready;

        const messaging = getMessaging(app);

        // FIX: Eliminados console.log con datos sensibles (App Options, VAPID key)
        // Solo logging en development:
        if (process.env.NODE_ENV === 'development') {
          console.debug('[useWebPush] SW registrado en scope:', registration.scope);
        }

        const token = await getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration: registration,
        });

        if (!token) throw new Error('Firebase no pudo generar el token push.');

        setFcmToken(token);

        // Registrar token en Firestore (funciona con o sin usuario autenticado)
        const auth = getAuth(app);
        const user = auth.currentUser;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (user) {
          const idToken = await user.getIdToken(true);
          headers['Authorization'] = `Bearer ${idToken}`;
        }

        const respuesta = await fetch('/api/web-push/register', {
          method: 'POST',
          headers,
          body: JSON.stringify({ docId, fcmToken: token }),
        });

        if (respuesta.ok) {
          toast({
            title: '🔔 Notificaciones Activadas',
            description:
              'Recibirás alertas nativas en este dispositivo cada vez que tu caso tenga novedades.',
            duration: 8000,
          });
        }

        return token;
      } catch (error) {
        // FIX: No loggear el error completo con stack trace en producción
        if (process.env.NODE_ENV === 'development') {
          console.error('[useWebPush] FCM Token falló:', error);
        }

        // SELF-HEALING: Si el token o SW están corruptos, los destruimos.
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const r of regs) {
            await r.unregister();
          }
          try {
            const tempMessaging = getMessaging(app);
            await deleteToken(tempMessaging).catch(() => {});
          } catch {}
        } catch {}

        toast({
          variant: 'destructive',
          title: 'Error de Configuración',
          description:
            'No se pudo activar el sistema de alertas. Por favor, recarga la página e intenta de nuevo.',
        });
        return null;
      } finally {
        setIsHandlingPermission(false);
      }
    },
    [toast]
  );

  return {
    requestNotificationPermission,
    mostrarBannerPushNotificacion,
    cerrarBannerPush,
    isHandlingPermission,
    fcmToken,
    yaTienePermiso,
    mostrarBannerPush,
    estadoPermiso:
      typeof window !== 'undefined' && 'Notification' in window
        ? Notification.permission
        : 'default',
  };
}
