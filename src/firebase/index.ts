'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { logger } from '@/lib/logger/security-logger';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!getApps().length) {
    const firebaseApp = initializeApp(firebaseConfig);
    const sdks = getSdks(firebaseApp);

    // Auto-detect emulator in developer/test mode
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
      try {
        const host = '127.0.0.1';
        connectFirestoreEmulator(sdks.firestore, host, 8080);
        logger.info(`[DevHelper] Enlazado al Firestore Emulator (${host}:8080)`);
      } catch (e) {
        logger.warn('[DevHelper] Firestore Emulator ya conectado o fallido.', { error: String(e) });
      }
    }

    return sdks;
  }

  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
