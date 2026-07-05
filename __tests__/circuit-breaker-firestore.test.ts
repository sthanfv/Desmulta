import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CircuitBreakerFs } from '../src/lib/security/circuit-breaker-firestore';

// Mock del inicializador de Firebase Admin para evitar llamadas reales en la suite de pruebas
vi.mock('@/lib/firebase-admin', () => ({
  getAdminApp: vi.fn(() => ({})),
}));

// Estructura de mocks para Firestore Document
const mockDoc = {
  get: vi.fn(),
  set: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const mockCollection = {
  doc: vi.fn(() => mockDoc),
};

const mockDb = {
  collection: vi.fn(() => mockCollection),
};

vi.mock('firebase-admin/firestore', () => {
  return {
    getFirestore: vi.fn(() => mockDb),
    FieldValue: {
      serverTimestamp: vi.fn(() => Date.now()),
    },
  };
});

describe('CircuitBreakerFs (Firestore implementation)', () => {
  const serviceName = 'TEST_SERVICE';
  let circuitBreaker: CircuitBreakerFs;

  beforeEach(() => {
    vi.clearAllMocks();
    circuitBreaker = new CircuitBreakerFs({
      serviceName,
      failureThreshold: 3,
      resetTimeoutMs: 30000,
    });
  });

  it('(1) getState() retorna CLOSED cuando no hay documento', async () => {
    mockDoc.get.mockResolvedValueOnce({
      exists: false,
      data: () => undefined,
    });

    const state = await circuitBreaker.getState();
    expect(state).toBe('CLOSED');
    expect(mockCollection.doc).toHaveBeenCalledWith(serviceName);
  });

  it('(2) getState() retorna OPEN cuando openedAt es reciente', async () => {
    const now = Date.now();
    mockDoc.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        failureCount: 3,
        openedAt: now - 1000, // Hace 1 segundo, circuito abierto (30s timeout)
      }),
    });

    const state = await circuitBreaker.getState();
    expect(state).toBe('OPEN');
  });

  it('(3) getState() retorna HALF_OPEN cuando openedAt superó resetTimeoutMs', async () => {
    const now = Date.now();
    mockDoc.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        failureCount: 3,
        openedAt: now - 35000, // Hace 35 segundos (superó el timeout de 30s)
      }),
    });

    const state = await circuitBreaker.getState();
    expect(state).toBe('HALF_OPEN');
  });

  it('(4) recordFailure() abre el circuito al alcanzar el umbral', async () => {
    mockDoc.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        failureCount: 2, // Con este fallo llegaremos a 3 (umbral = 3)
        openedAt: null,
      }),
    });

    await circuitBreaker.recordFailure();

    expect(mockDoc.set).toHaveBeenCalledWith(
      expect.objectContaining({
        failureCount: 3,
        openedAt: expect.any(Number),
      }),
      { merge: true }
    );
  });

  it('(5) recordSuccess() elimina el documento (cierra el circuito)', async () => {
    mockDoc.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        failureCount: 1,
        openedAt: null,
      }),
    });

    await circuitBreaker.recordSuccess();

    expect(mockDoc.delete).toHaveBeenCalled();
  });

  it('(6) getState() retorna CLOSED si Firestore falla (fail-open en lectura de estado)', async () => {
    mockDoc.get.mockRejectedValueOnce(new Error('Firestore unavailable'));

    const state = await circuitBreaker.getState();
    expect(state).toBe('CLOSED');
  });

  it('(7) isOpen() retorna true cuando el circuito está OPEN', async () => {
    mockDoc.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        failureCount: 3,
        openedAt: Date.now() - 1000,
      }),
    });
    const open = await circuitBreaker.isOpen();
    expect(open).toBe(true);
  });

  it('(8) isOpen() retorna false cuando el circuito está CLOSED', async () => {
    mockDoc.get.mockResolvedValueOnce({
      exists: false,
      data: () => undefined,
    });
    const open = await circuitBreaker.isOpen();
    expect(open).toBe(false);
  });

  it('(9) loadState() carga el estado del circuito desde Firestore', async () => {
    mockDoc.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        failureCount: 2,
        openedAt: null,
      }),
    });
    await expect(circuitBreaker.loadState()).resolves.not.toThrow();
    expect(mockDoc.get).toHaveBeenCalled();
  });

  it('(10) loadState() no falla si el documento no existe', async () => {
    mockDoc.get.mockResolvedValueOnce({
      exists: false,
      data: () => undefined,
    });
    await expect(circuitBreaker.loadState()).resolves.not.toThrow();
  });

  it('(11) saveState() escribe el estado en Firestore', async () => {
    await circuitBreaker.saveState({ failureCount: 1, openedAt: null });
    expect(mockDoc.set).toHaveBeenCalledWith(
      expect.objectContaining({
        failureCount: 1,
        openedAt: null,
        updatedAt: expect.any(Number),
      }),
      { merge: true }
    );
  });

  it('(12) recordFailure() maneja errores de Firestore de manera segura (fail-safe)', async () => {
    mockDoc.get.mockRejectedValueOnce(new Error('Firestore error'));
    await expect(circuitBreaker.recordFailure()).resolves.not.toThrow();
  });

  it('(13) recordSuccess() maneja errores de Firestore de manera segura (fail-safe)', async () => {
    mockDoc.get.mockRejectedValueOnce(new Error('Firestore error'));
    await expect(circuitBreaker.recordSuccess()).resolves.not.toThrow();
  });
});
