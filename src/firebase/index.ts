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
      } catch (e: unknown) {
        logger.warn('[DevHelper] Firestore Emulator ya conectado o fallido.', {
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return sdks;
  }

  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  let firestore;
  try {
    if (typeof window !== 'undefined') {
      const {
        initializeFirestore,
        persistentLocalCache,
        persistentMultipleTabManager,
      } = require('firebase/firestore');
      firestore = initializeFirestore(firebaseApp, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      });
    } else {
      firestore = getFirestore(firebaseApp);
    }
  } catch (e) {
    firestore = getFirestore(firebaseApp);
  }

  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore,
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
