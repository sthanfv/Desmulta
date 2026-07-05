'use client';

import React, { useState, useEffect } from 'react';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { app } from '@/lib/firebase-client';
import { BellRing, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VipPushNotificationProps {
  expedienteId: string;
}

export function VipPushNotification({ expedienteId }: VipPushNotificationProps) {
  const [isHandling, setIsHandling] = useState(false);
  const [yaTienePermiso, setYaTienePermiso] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const permisoActual = Notification.permission;
    if (permisoActual === 'granted' || permisoActual === 'denied') {
      setYaTienePermiso(true);
    }
  }, []);

  const handleActivarPush = async () => {
    setIsHandling(true);
    try {
      const soportado = await isSupported();
      if (!soportado) {
        toast({
          title: 'Navegador no compatible',
          description: 'Tu navegador no admite notificaciones push.',
          variant: 'destructive',
        });
        return;
      }

      let permiso = Notification.permission;
      if (permiso === 'default') {
        permiso = await Notification.requestPermission();
      }

      if (permiso !== 'granted') {
        toast({
          variant: 'destructive',
          title: permiso === 'denied' ? 'Permiso Bloqueado' : 'Notificaciones Omitidas',
          description: 'Debes habilitar las notificaciones en la configuración de tu navegador.',
        });
        setYaTienePermiso(true);
        return;
      }

      setYaTienePermiso(true);

      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        updateViaCache: 'none',
        scope: '/',
      });
      await navigator.serviceWorker.ready;

      const messaging = getMessaging(app);
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration,
      });

      if (!token) throw new Error('No se pudo generar el token push.');

      // Llamar al backend VIP
      const res = await fetch('/api/vip/web-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expedienteId, fcmToken: token }),
      });

      if (res.ok) {
        toast({
          title: '🔔 Notificaciones Activadas',
          description: 'Recibirás actualizaciones de tu caso en este dispositivo.',
          duration: 5000,
        });
      } else {
        throw new Error('Error al registrar token en el servidor.');
      }
    } catch (_error) {
      toast({
        variant: 'destructive',
        title: 'Error de Configuración',
        description: 'No se pudo activar el sistema de alertas.',
      });
    } finally {
      setIsHandling(false);
    }
  };

  if (yaTienePermiso) {
    return null;
  }

  return (
    <button
      onClick={handleActivarPush}
      disabled={isHandling}
      className="w-full py-3 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/30 text-[#D4AF37] rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
    >
      {isHandling ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />}
      Activar Notificaciones Push
    </button>
  );
}
