/**
 * Zero-Trust Logout (Scorched Earth)
 *
 * Este módulo garantiza la destrucción total de la sesión en el cliente,
 * incluyendo cookies, almacenamiento local, bases de datos IndexedDB
 * y la caché del Service Worker (Workbox).
 */

import { logger } from '@/lib/logger/security-logger';

import type { Auth } from 'firebase/auth';

export async function secureLogout(
  authInstance: Auth | null | undefined,
  reason: string = 'manual',
  skipRedirect: boolean = false
) {
  logger.warn(`Iniciando cierre de sesión seguro (Zero-Trust). Razón: ${reason}`);

  try {
    // 1. Invalidar sesión en el servidor (elimina cookies HTTP)
    await fetch('/api/auth/session', { method: 'DELETE' });

    // 2. Cerrar sesión en el SDK de Firebase Client
    if (authInstance) {
      await authInstance.signOut();
    }

    // 3. Destruir almacenamiento síncrono del navegador
    localStorage.clear();
    sessionStorage.clear();

    // Destrucción de IndexedDB (Tierra Arrasada)
    if (typeof window !== 'undefined' && window.indexedDB && window.indexedDB.databases) {
      try {
        const dbs = await window.indexedDB.databases();
        dbs.forEach((db) => {
          // FIX HALLAZGO: No borrar bases de datos de Firebase. 
          // Borrarlas abruptamente corrompe el SDK y causa 'auth/network-request-failed' en el siguiente login.
          if (db.name && !db.name.startsWith('firebase')) {
            window.indexedDB.deleteDatabase(db.name);
          }
        });
      } catch (e: unknown) {
        logger.warn('No se pudo limpiar IndexedDB', e);
      }
    }

    // 4. Barrido de Caché del Service Worker (Workbox / CacheStorage)
    if (typeof caches !== 'undefined') {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }

    // 5. Desregistrar Service Workers (Evita que intercepten red en estado corrupto tras borrar caches)
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      } catch (e: unknown) {
        logger.warn('No se pudieron desregistrar los Service Workers', e);
      }
    }

    logger.info('Cierre de sesión Scorched Earth completado con éxito.');
  } catch (error: unknown) {
    logger.error('Error durante el cierre de sesión seguro', error);
  } finally {
    if (!skipRedirect) {
      // 6. Redirección dura (sin router.push) para purgar memoria RAM de Next.js
      window.location.href = `/acceso-panel${reason !== 'manual' ? `?reason=${reason}` : ''}`;
    }
  }
}
