/**
 * Zero-Trust Logout (Scorched Earth)
 * 
 * Este módulo garantiza la destrucción total de la sesión en el cliente,
 * incluyendo cookies, almacenamiento local, bases de datos IndexedDB
 * y la caché del Service Worker (Workbox).
 */

import { logger } from '@/lib/logger/security-logger';

import type { Auth } from 'firebase/auth';

export async function secureLogout(authInstance: Auth | null | undefined, reason: string = 'manual') {
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

    // 4. Barrido de Caché del Service Worker (Workbox / CacheStorage)
    if (typeof caches !== 'undefined') {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }

    // 5. Destrucción de IndexedDB (Firebase Auth y otros estados persistentes)
    if (typeof window !== 'undefined' && window.indexedDB) {
      try {
        const databases = await window.indexedDB.databases?.();
        if (databases) {
          for (const db of databases) {
            if (db.name) {
              window.indexedDB.deleteDatabase(db.name);
            }
          }
        }
      } catch (e) {
        // En navegadores antiguos o Firefox incognito `databases()` puede fallar
        logger.warn('No se pudo borrar IndexedDB (navegador no soporta enumeración)', e);
      }
    }

    logger.info('Cierre de sesión Scorched Earth completado con éxito.');
  } catch (error) {
    logger.error('Error durante el cierre de sesión seguro', error);
  } finally {
    // 6. Redirección dura (sin router.push) para purgar memoria RAM de Next.js
    window.location.href = `/acceso-panel${reason !== 'manual' ? `?reason=${reason}` : ''}`;
  }
}
