'use client';

import { useState, useEffect } from 'react';
import {
  DocumentReference,
  onSnapshot,
  DocumentData,
  FirestoreError,
  DocumentSnapshot,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Utility type to add an 'id' field to a given type T. */
type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useDoc hook.
 * @template T Type of the document data.
 */
export interface UseDocResult<T> {
  data: WithId<T> | null; // Document data with ID, or null.
  isLoading: boolean; // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

/**
 * React hook to subscribe to a single Firestore document in real-time.
 * Handles nullable references.
 *
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedTargetRefOrQuery or BAD THINGS WILL HAPPEN
 * use useMemo to memoize it per React guidence.  Also make sure that it's dependencies are stable
 * references
 *
 *
 * @template T Optional type for document data. Defaults to any.
 * @param {DocumentReference<DocumentData> | null | undefined} docRef -
 * The Firestore DocumentReference. Waits if null/undefined.
 * @returns {UseDocResult<T>} Object with data, isLoading, error.
 */
export function useDoc<T = DocumentData>(
  memoizedDocRef: DocumentReference<DocumentData> | null | undefined,
  options?: { suppressGlobalError?: boolean }
): UseDocResult<T> {
  type StateDataType = WithId<T> | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    if (!memoizedDocRef) {
      setData(null);

      setIsLoading(false);

      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Timeout de seguridad en caso de que Firestore se cuelgue (ej: falta .env)
    const fallbackTimeout = setTimeout(() => {
      setIsLoading((prev) => {
        if (prev) {
          // En producción esto indica cold start de Firestore — no es error
          if (process.env.NODE_ENV === 'development') {
            console.warn('Firestore useDoc: cold start detectado, liberando loading state.');
          }
          return false;
        }
        return prev;
      });
    }, 10000); // 10s en lugar de 5s para redes lentas colombianas

    const unsubscribe = onSnapshot(
      memoizedDocRef,
      (snapshot: DocumentSnapshot<DocumentData>) => {
        if (snapshot.exists()) {
          setData({ ...(snapshot.data() as T), id: snapshot.id });
        } else {
          // Document does not exist
          setData(null);
        }
        setError(null); // Clear any previous error on successful snapshot (even if doc doesn't exist)
        setIsLoading(false);
      },
      (err: import('firebase/firestore').FirestoreError) => {
        let contextualError: Error;

        if (err.code === 'permission-denied') {
          contextualError = new FirestorePermissionError({
            operation: 'get',
            path: memoizedDocRef.path,
          });
        } else {
          // Capturar el error real (por ej: unavailable, timeout, etc.)
          contextualError = err;
          console.error(`[useDoc] Error real de Firestore en ${memoizedDocRef.path}:`, err);
        }

        setError(contextualError);
        setData(null);
        setIsLoading(false);

        // trigger global error propagation solo si no está suprimido
        if (!options?.suppressGlobalError && err.code === 'permission-denied') {
          errorEmitter.emit(
            'permission-error',
            contextualError as import('@/firebase/errors').FirestorePermissionError
          );
        } else if (process.env.NODE_ENV === 'development') {
          console.warn(
            '[useDoc] Permiso denegado silenciado (suppressGlobalError) para:',
            memoizedDocRef.path
          );
        }
      }
    );

    return () => {
      clearTimeout(fallbackTimeout);
      unsubscribe();
    };
  }, [memoizedDocRef, options?.suppressGlobalError]); // Re-run if the memoizedDocRef changes.

  return { data, isLoading, error };
}
