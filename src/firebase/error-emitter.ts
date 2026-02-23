'use client';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Defines the shape of all possible events and their corresponding payload types.
 * This centralizes event definitions for type safety across the application.
 */
export interface AppEvents {
  'permission-error': FirestorePermissionError;
  // Index signature requerido para satisfacer Record<string, unknown>
  [key: string]: unknown;
}

// A generic type for a callback function.
type Callback<T> = (data: T) => void;

/**
 * A strongly-typed pub/sub event emitter.
 * It uses a generic type T that extends a record of event names to payload types.
 */
function createEventEmitter<T extends Record<string, unknown>>() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events = new Map<keyof T, Array<Callback<any>>>();

  return {
    /**
     * Subscribe to an event.
     */
    on<K extends keyof T>(eventName: K, callback: Callback<T[K]>) {
      if (!events.has(eventName)) {
        events.set(eventName, []);
      }
      events.get(eventName)?.push(callback);
    },

    /**
     * Unsubscribe from an event.
     */
    off<K extends keyof T>(eventName: K, callback: Callback<T[K]>) {
      const callbacks = events.get(eventName);
      if (!callbacks) return;

      events.set(
        eventName,
        callbacks.filter((cb) => cb !== callback)
      );
    },

    /**
     * Publish an event to all subscribers.
     */
    emit<K extends keyof T>(eventName: K, data: T[K]) {
      events.get(eventName)?.forEach((callback) => callback(data));
    },
  };
}

// Create and export a singleton instance of the emitter, typed with our AppEvents interface.
export const errorEmitter = createEventEmitter<AppEvents>();
