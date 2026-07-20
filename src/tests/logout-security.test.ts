import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { secureLogout } from '@/lib/security/client-logout';

// Mock logger
vi.mock('@/lib/logger/security-logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('secureLogout (Zero-Trust Caching)', () => {
  let mockAuth: any;
  let originalWindow: any;
  let originalLocalStorage: any;
  let originalSessionStorage: any;

  beforeEach(() => {
    // 1. Mock Fetch
    global.fetch = vi.fn().mockResolvedValue({ ok: true });

    // 2. Mock Firebase Auth
    mockAuth = {
      signOut: vi.fn().mockResolvedValue(true),
    };

    // 3. Mock window location
    originalWindow = global.window;
    Object.defineProperty(global, 'window', {
      value: {
        location: {
          href: '',
        },
        indexedDB: {
          databases: vi
            .fn()
            .mockResolvedValue([
              { name: 'firebaseLocalStorageDb' },
              { name: 'workbox-expiration' },
            ]),
          deleteDatabase: vi.fn(),
        },
      },
      writable: true,
    });

    // 4. Mock LocalStorage y SessionStorage
    originalLocalStorage = global.localStorage;
    originalSessionStorage = global.sessionStorage;
    Object.defineProperty(global, 'localStorage', {
      value: { clear: vi.fn() },
      writable: true,
    });
    Object.defineProperty(global, 'sessionStorage', {
      value: { clear: vi.fn() },
      writable: true,
    });

    // 5. Mock Caches API (Workbox)
    Object.defineProperty(global, 'caches', {
      value: {
        keys: vi.fn().mockResolvedValue(['precache-v1', 'runtime-v1']),
        delete: vi.fn().mockResolvedValue(true),
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.window = originalWindow;
    global.localStorage = originalLocalStorage;
    global.sessionStorage = originalSessionStorage;
  });

  it('debe ejecutar la secuencia completa de "Scorched Earth" (Tierra Arrasada)', async () => {
    // Act
    await secureLogout(mockAuth, 'manual');

    // Assert 1: Invalida cookie en servidor
    expect(global.fetch).toHaveBeenCalledWith('/api/auth/session', { method: 'DELETE' });

    // Assert 2: Revoca SDK cliente Firebase
    expect(mockAuth.signOut).toHaveBeenCalled();

    // Assert 3: Limpia Storage Síncrono
    expect(global.localStorage.clear).toHaveBeenCalled();
    expect(global.sessionStorage.clear).toHaveBeenCalled();

    // Assert 4: Limpia Service Worker Caches
    expect(global.caches.keys).toHaveBeenCalled();
    expect(global.caches.delete).toHaveBeenCalledWith('precache-v1');
    expect(global.caches.delete).toHaveBeenCalledWith('runtime-v1');

    // Assert 5: Destruye IndexedDB
    expect(global.window.indexedDB.databases).toHaveBeenCalled();
    expect(global.window.indexedDB.deleteDatabase).toHaveBeenCalledWith('firebaseLocalStorageDb');
    expect(global.window.indexedDB.deleteDatabase).toHaveBeenCalledWith('workbox-expiration');

    // Assert 6: Redirección dura a /acceso-panel
    expect(global.window.location.href).toBe('/acceso-panel');
  });

  it('debe propagar la razón de inactividad en la URL de redirección', async () => {
    // Act
    await secureLogout(mockAuth, 'inactividad');

    // Assert
    expect(global.window.location.href).toBe('/acceso-panel?reason=inactividad');
  });

  it('no debe romper si caches o indexedDB no están disponibles en el navegador', async () => {
    // Remove caches and indexedDB to simulate incognito or old browser
    Object.defineProperty(global, 'caches', { value: undefined, writable: true });
    Object.defineProperty(global.window, 'indexedDB', { value: undefined, writable: true });

    // Act
    await secureLogout(mockAuth, 'manual');

    // Assert: must still redirect gracefully without throwing unhandled exceptions
    expect(global.window.location.href).toBe('/acceso-panel');
    expect(global.localStorage.clear).toHaveBeenCalled();
  });
});
