import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Suite de pruebas para el Motor de Auto-Sanación PWA. ──

/**
 * Suite de pruebas para el Motor de Auto-Sanación PWA.
 * Valida las 5 fases del protocolo de purga.
 */

// ── Mocks globales del navegador ──

const mockCachesDelete = vi.fn().mockResolvedValue(true);
const mockCachesKeys = vi.fn().mockResolvedValue(['workbox-precache', 'sw-runtime']);
const mockUnregister = vi.fn().mockResolvedValue(true);
const mockGetRegistrations = vi.fn().mockResolvedValue([{ unregister: mockUnregister }]);
const mockDeleteDatabase = vi.fn();
const mockDatabases = vi.fn().mockResolvedValue([
  { name: 'firebaseLocalStorageDb', version: 1 },
  { name: 'firebase-heartbeat-database', version: 1 },
  { name: 'otra-base-no-firebase', version: 1 },
]);

// Mock de location.replace
const mockReplace = vi.fn();
const mockReload = vi.fn();

beforeEach(() => {
  // Silenciar logs para pruebas limpias
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});

  // Simular APIs del navegador usando stubGlobal (v5.13.0+)
  vi.stubGlobal('caches', {
    keys: mockCachesKeys,
    delete: mockCachesDelete,
  });
  vi.stubGlobal('navigator', {
    serviceWorker: {
      getRegistrations: mockGetRegistrations,
    },
  });
  vi.stubGlobal('indexedDB', {
    databases: mockDatabases,
    deleteDatabase: mockDeleteDatabase,
  });
  vi.stubGlobal('location', {
    replace: mockReplace,
    reload: mockReload,
  });

  // Poblar localStorage con datos de prueba
  localStorage.setItem('desmulta-expediente-storage', '{"cedula":"123"}');
  localStorage.setItem('consultation_draft', '{"paso":1}');
  localStorage.setItem('pwa-prompt-dismissed', '1710000000');
  localStorage.setItem('dato-externo-intocable', 'conservar');
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  vi.resetModules(); // 👈 MANDATO-FILTRO: Reinicia el módulo de auto-sanación (isHealingInProgress)
});

describe('🧹 Motor de Auto-Sanación PWA (healPwaCache)', () => {
  it('Fase 1: Debe eliminar todos los cachés del Service Worker', async () => {
    const { healPwaCache } = await import('@/lib/utils/pwa-heal');
    await healPwaCache();

    expect(mockCachesKeys).toHaveBeenCalledOnce();
    expect(mockCachesDelete).toHaveBeenCalledWith('workbox-precache');
    expect(mockCachesDelete).toHaveBeenCalledWith('sw-runtime');
  });

  it('Fase 2: Debe desregistrar todos los Service Workers', async () => {
    const { healPwaCache } = await import('@/lib/utils/pwa-heal');
    await healPwaCache();

    expect(mockGetRegistrations).toHaveBeenCalled();
    expect(mockUnregister).toHaveBeenCalled();
  });

  it('Fase 3: Debe limpiar solo las claves conocidas de localStorage', async () => {
    const { healPwaCache } = await import('@/lib/utils/pwa-heal');
    await healPwaCache();

    // Las claves de la app deben desaparecer
    expect(localStorage.getItem('desmulta-expediente-storage')).toBeNull();
    expect(localStorage.getItem('consultation_draft')).toBeNull();
    expect(localStorage.getItem('pwa-prompt-dismissed')).toBeNull();

    // Los datos externos deben sobrevivir
    expect(localStorage.getItem('dato-externo-intocable')).toBe('conservar');
  });

  it('Fase 4: Debe purgar solo las bases IndexedDB de Firebase', async () => {
    const { healPwaCache } = await import('@/lib/utils/pwa-heal');
    await healPwaCache();

    // Firebase SDK bases — deben eliminarse
    expect(mockDeleteDatabase).toHaveBeenCalledWith('firebaseLocalStorageDb');
    expect(mockDeleteDatabase).toHaveBeenCalledWith('firebase-heartbeat-database');

    // Bases externas — NO deben tocarse
    expect(mockDeleteDatabase).not.toHaveBeenCalledWith('otra-base-no-firebase');
  });

  it('Fase 5: Debe ejecutar reinicio forzado a la raíz', async () => {
    const { healPwaCache } = await import('@/lib/utils/pwa-heal');
    await healPwaCache();

    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('Fase 6 [Fallback]: Debe hacer reload() si hay un error crítico durante las purgas', async () => {
    // Forzamos un fallo en caches
    Object.defineProperty(window, 'caches', {
      value: { keys: vi.fn().mockRejectedValue(new Error('Cache Crash')) },
      writable: true,
      configurable: true,
    });

    const { healPwaCache } = await import('@/lib/utils/pwa-heal');
    await healPwaCache();

    expect(mockReload).toHaveBeenCalledOnce();
  });
});
