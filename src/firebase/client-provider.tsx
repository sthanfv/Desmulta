'use client';

import React, { useMemo, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
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

  // La persistencia offline de Firestore ahora se inicializa
  // directamente en la función getSdks (src/firebase/index.ts)
  // usando persistentLocalCache, conforme a Firebase v11.

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
