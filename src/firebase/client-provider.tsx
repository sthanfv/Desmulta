'use client';

import React, { useMemo, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { enableIndexedDbPersistence } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { logger } from '@/lib/logger/security-logger';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    // Initialize Firebase on the client side, once per component mount.
    return initializeFirebase();
  }, []); // Empty dependency array ensures this runs only once on mount

  // Activar App Check (Escudo reCAPTCHA Enterprise)
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
      // Habilita el modo debug en localhost para que puedas seguir desarrollando sin bloqueos
      if (process.env.NODE_ENV === 'development') {
        (window as Record<string, unknown>).FIREBASE_APPCHECK_DEBUG_TOKEN =
          process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN || true;
      }

      try {
        initializeAppCheck(firebaseServices.firebaseApp, {
          provider: new ReCaptchaEnterpriseProvider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY),
          isTokenAutoRefreshEnabled: true, // Renueva el escudo en segundo plano
        });
        logger.info('[🛡️ App Check] Escudo reCAPTCHA inicializado');
      } catch (error) {
        logger.error('[🛡️ App Check] Error al inicializar', error);
      }
    }
  }, [firebaseServices.firebaseApp]);

  // Activar persistencia offline de Firestore para soporte modo avión.
  // Permite al operador leer datos y hacer cambios sin internet;
  // los cambios se sincronizan automáticamente al reconectar.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    enableIndexedDbPersistence(firebaseServices.firestore).catch((err: { code: string }) => {
      if (err.code === 'failed-precondition') {
        // Caso normal: múltiples pestañas abiertas → solo la primera tab activa tiene persistencia.
        // NO es un error, es comportamiento esperado del SDK de Firebase.
        logger.info('[Desmulta] Persistencia offline activa en otra pestaña del navegador.');
      } else if (err.code === 'unimplemented') {
        // Navegador antiguo o modo incógnito restringido sin soporte a IndexedDB.
        // La app sigue funcionando, solo sin modo offline.
        logger.warn(
          '[Desmulta] Este navegador no soporta persistencia offline (IndexedDB no disponible).'
        );
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo ejecutar al montar — firebaseServices.firestore no cambia entre renders

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
