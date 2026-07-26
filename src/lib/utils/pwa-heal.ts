'use client';

/**
 * Motor de Auto-Sanación PWA — Zero-Crash Protocol v7.4.3
 *
 * Destruye cachés corruptos, desregistra Service Workers zombis,
 * purga estado persistente (Zustand/localStorage) y limpia IndexedDB.
 * Diseñado para ser invocado desde los Error Boundaries de la aplicación.
 *
 * @module pwa-heal
 */

/** Bandera anti-doble-ejecución */
let isHealingInProgress = false;

/**
 * Claves de localStorage conocidas de la aplicación.
 * Se limpian de forma dirigida para no destruir datos de terceros
 * (Turnstile, Vercel Analytics, etc.).
 */
const KNOWN_LOCAL_STORAGE_KEYS = [
  'desmulta-expediente-storage', // Zustand persist (expedientes/multas)
  'consultation_draft', // Borrador del formulario de consulta
  'pwa-prompt-dismissed', // Prompt de instalación PWA
  'desmulta_welcome_time',
  'desmulta_client_token',
  'desmulta_active_case',
] as const;

/**
 * Prefijos de bases IndexedDB creadas por Firebase SDK
 * que pueden corromperse y causar errores de inicialización.
 */
const INDEXED_DB_PREFIXES = [
  'firebaseLocalStorage',
  'firebase-heartbeat',
  'firebase-installations',
] as const;

/**
 * Ejecuta el protocolo completo de auto-sanación PWA.
 * 5 fases: Cachés → Service Workers → localStorage → IndexedDB → Reinicio.
 *
 * @returns {Promise<void>} Se resuelve justo antes del reinicio forzado.
 */
export async function healPwaCache(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (isHealingInProgress) return;

  isHealingInProgress = true;

  try {
    console.warn('🧹 [PWA Auto-Heal]: Iniciando protocolo de purga...');

    // ── FASE 1: Aniquilación de Cachés del Service Worker ──
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      console.warn(`✅ [PWA Auto-Heal]: ${cacheNames.length} cachés de red eliminados.`);
    }

    // ── FASE 2: Desregistro de Service Workers zombis ──
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));
      console.warn(`✅ [PWA Auto-Heal]: ${registrations.length} Service Workers desregistrados.`);
    }

    // ── FASE 3: Limpieza dirigida de localStorage ──
    for (const key of KNOWN_LOCAL_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }

    // Limpieza de claves dinámicas de última visita (Tracking UI)
    Object.keys(localStorage)
      .filter((k) => k.startsWith('desmulta_last_seen_'))
      .forEach((k) => localStorage.removeItem(k));
    sessionStorage.clear();
    console.warn('✅ [PWA Auto-Heal]: Estado local purgado (localStorage + sessionStorage).');

    // ── FASE 4: Purga de IndexedDB (Firebase SDK) ──
    await purgeIndexedDB();
    console.warn('✅ [PWA Auto-Heal]: Bases IndexedDB de Firebase purgadas.');

    // ── FASE 5: Reinicio Forzado en Frío ──
    console.warn('🔄 [PWA Auto-Heal]: Reinicio forzado en frío. Redireccionando a root...');
    window.location.replace('/');
  } catch (error) {
    console.error('🚨 [PWA Auto-Heal]: Fallo crítico durante la purga', error);
    // Fallback: si todo falla, al menos recargamos la página
    window.location.reload();
  }
}

/**
 * Elimina las bases de datos IndexedDB que coincidan
 * con los prefijos conocidos de Firebase SDK.
 */
async function purgeIndexedDB(): Promise<void> {
  if (!('indexedDB' in window)) return;

  // No todos los navegadores soportan databases()
  if (typeof indexedDB.databases !== 'function') return;

  try {
    const databases = await indexedDB.databases();
    const firebaseDbs = databases.filter((db) =>
      INDEXED_DB_PREFIXES.some((prefix) => db.name?.startsWith(prefix))
    );

    for (const db of firebaseDbs) {
      if (db.name) {
        indexedDB.deleteDatabase(db.name);
      }
    }
  } catch {
    // Silenciar errores de IndexedDB — no son críticos para la sanación
  }
}

/**
 * Devuelve `true` si ya hay una sanación en curso.
 * Útil para controlar el estado de UI (spinners, botones deshabilitados).
 */
export function isHealing(): boolean {
  return isHealingInProgress;
}
