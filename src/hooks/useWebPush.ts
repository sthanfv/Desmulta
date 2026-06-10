'use client';
import { logger } from '@/lib/logger/security-logger';

import { useState, useCallback, useEffect } from 'react';
import { getMessaging, getToken, isSupported, deleteToken } from 'firebase/messaging';
import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase-client';
import { useToast } from './use-toast';

// ─────────────────────────────────────────────────────────────────────────────
// UTILIDADES INTERNAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Registra el firebase-messaging-sw.js y devuelve la instancia del SW.
 * Si ya está registrado (Workbox), devuelve el SW activo.
 */
async function registrarFirebaseSW(): Promise<ServiceWorkerRegistration> {
  let swReg: ServiceWorkerRegistration | null = null;
  try {
    swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      updateViaCache: 'none',
      scope: '/',
    });
  } catch {
    // sw.js Workbox ya registrado - usar el existente
  }
  return swReg ?? (await navigator.serviceWorker.ready);
}

/**
 * Obtiene el token FCM actual o intenta regenerarlo.
 * Retorna null si no es posible (sin permisos, sin soporte).
 */
async function obtenerTokenFCM(vapidKey: string): Promise<string | null> {
  const soportado = await isSupported();
  if (!soportado) return null;

  const sw = await registrarFirebaseSW();
  const messaging = getMessaging(app);

  try {
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: sw,
    });
    return token || null;
  } catch {
    return null;
  }
}

/**
 * Envía el token FCM al backend para vincularlo al expediente.
 * Llama al endpoint /api/web-push/register.
 */
async function registrarTokenEnBackend(docId: string, fcmToken: string): Promise<boolean> {
  try {
    const auth = getAuth(app);
    const user = auth.currentUser;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (user) {
      const idToken = await user.getIdToken(true);
      headers['Authorization'] = `Bearer ${idToken}`;
    }

    const res = await fetch('/api/web-push/register', {
      method: 'POST',
      headers,
      body: JSON.stringify({ docId, fcmToken }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

interface UseWebPushOptions {
  /**
   * ID del expediente activo (shortId o docId).
   * Si se provee, el hook intentará re-registrar el token automáticamente
   * en cada montaje cuando el permiso ya esté concedido.
   * Útil para el portal de seguimiento donde el docId siempre está disponible.
   */
  docId?: string;
}

export function useWebPush(options: UseWebPushOptions = {}) {
  const { docId: propDocId } = options;

  const [isHandlingPermission, setIsHandlingPermission] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [yaTienePermiso, setYaTienePermiso] = useState(false);
  const [mostrarBannerPush, setMostrarBannerPush] = useState(false);
  const { toast } = useToast();

  // ──────────────────────────────────────────────────────────────────────────
  // EFECTO DE MONTAJE: Restaurar token y re-registrar si hay permiso previo
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      !('serviceWorker' in navigator)
    )
      return;

    // Esperar a que el SW de next-pwa esté listo
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
    }

    if (permisoActual === 'granted') {
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        logger.error('[useWebPush] NEXT_PUBLIC_FIREBASE_VAPID_KEY no está configurada.');
        return;
      }

      // Restaurar + re-registrar token en background (best-effort)
      (async () => {
        const token = await obtenerTokenFCM(vapidKey);
        if (!token) return;

        setFcmToken(token);

        // Determinar el docId a usar: prop > localStorage
        const targetDocId = propDocId || localStorage.getItem('desmulta_active_case');

        if (targetDocId) {
          // RE-REGISTRO SILENCIOSO: re-vincula el token aunque el anterior
          // haya sido limpiado por FCM o expirado. Esto cura la "sordera" del
          // sistema cuando el usuario reinstala o cambia de navegador.
          const ok = await registrarTokenEnBackend(targetDocId, token);
          if (process.env.NODE_ENV === 'development') {
            console.debug('[useWebPush] Re-registro silencioso:', ok ? 'OK' : 'FALLO', targetDocId);
          }
        }
      })();
    }
  }, [propDocId]);

  // ──────────────────────────────────────────────────────────────────────────
  // mostrarBannerPushNotificacion
  // ──────────────────────────────────────────────────────────────────────────
  const mostrarBannerPushNotificacion = useCallback(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const permiso = Notification.permission;
    // Solo mostrar si el usuario aún no ha tomado una decisión
    if (permiso === 'default') {
      setMostrarBannerPush(true);
    }
  }, []);

  const cerrarBannerPush = useCallback(() => {
    setMostrarBannerPush(false);
    setYaTienePermiso(true);
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // requestNotificationPermission
  // Solicita permiso al usuario, obtiene el token FCM y lo registra en Firestore.
  // ──────────────────────────────────────────────────────────────────────────
  const requestNotificationPermission = useCallback(
    async (docId: string): Promise<string | null> => {
      setIsHandlingPermission(true);
      setMostrarBannerPush(false);

      try {
        // 1. Verificar soporte del navegador
        const soportado = await isSupported();
        if (!soportado) {
          toast({
            title: 'Navegador no compatible',
            description:
              'Tu navegador no admite notificaciones push. Intenta con Chrome, Edge o Firefox.',
          });
          return null;
        }

        // 2. Verificar configuración de VAPID
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
          logger.error('[useWebPush] NEXT_PUBLIC_FIREBASE_VAPID_KEY no configurada.');
          toast({
            variant: 'destructive',
            title: 'Error de Configuración',
            description:
              'El sistema de alertas no está configurado correctamente. Contacta soporte.',
          });
          return null;
        }

        // 3. Solicitar permiso si aún no está decidido
        let permiso = Notification.permission;
        if (permiso === 'default') {
          permiso = await Notification.requestPermission();
        }

        // 4. Manejar rechazo
        if (permiso !== 'granted') {
          toast({
            variant: 'destructive',
            title: permiso === 'denied' ? 'Bloqueado por el Navegador' : 'Notificaciones Omitidas',
            description:
              permiso === 'denied'
                ? 'Toca el candado 🔒 junto a desmulta.online en la barra de dirección y activa las notificaciones.'
                : 'No podremos notificarte el resultado en tiempo real.',
            duration: 8000,
          });
          setYaTienePermiso(true);

          // Revocar el token en Firestore para no reintentar con tokens stale
          if (permiso === 'denied' && docId && docId !== 'OFFLINE_PENDING') {
            fetch('/api/web-push/revoke', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ docId }),
            }).catch(() => {});
          }

          return null;
        }

        setYaTienePermiso(true);

        // 5. Obtener token FCM
        if (!('serviceWorker' in navigator)) {
          throw new Error('Service Workers no soportados en este navegador.');
        }

        const registration = await registrarFirebaseSW();

        if (process.env.NODE_ENV === 'development') {
          console.debug('[useWebPush] SW registrado en scope:', registration.scope);
        }

        const messaging = getMessaging(app);
        const token = await getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration: registration,
        });

        if (!token) throw new Error('Firebase no pudo generar el token push.');

        setFcmToken(token);

        // 6. Registrar token en backend (con retry implícito: si falla,
        //    el re-registro silencioso en el próximo montaje lo recuperará)
        const registrado = await registrarTokenEnBackend(docId, token);

        if (registrado) {
          // Guardar en localStorage para el re-registro silencioso en futuras visitas
          localStorage.setItem('desmulta_active_case', docId);

          toast({
            title: '🔔 Notificaciones Activadas',
            description:
              'Recibirás alertas nativas en este dispositivo cada vez que tu caso tenga novedades.',
            duration: 8000,
          });
        } else {
          // El registro en backend falló pero tenemos el token — mostrar advertencia leve
          toast({
            title: 'Notificaciones casi listas',
            description:
              'Hay un problema de conexión temporal. Las alertas se activarán completamente en tu próxima visita.',
            duration: 6000,
          });
        }

        return token;
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          logger.error('[useWebPush] FCM Token falló:', error);
        }

        // Auto-sanación selectiva: solo desregistrar el SW de Firebase Messaging
        // para no destruir el SW principal de Workbox/next-pwa
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const r of regs) {
            if (r.active?.scriptURL?.includes('firebase-messaging-sw')) {
              await r.unregister();
            }
          }
          try {
            const tempMessaging = getMessaging(app);
            await deleteToken(tempMessaging).catch(() => {});
          } catch {}
          // Forzar el borrado de la base de datos de IndexedDB donde FCM guarda los tokens
          try {
            window.indexedDB.deleteDatabase('firebase-messaging-database');
          } catch {}
        } catch {}

        toast({
          variant: 'destructive',
          title: 'Error al activar alertas',
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
        : ('default' as NotificationPermission),
  };
}
