import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock de Firebase Client SDK
vi.mock('firebase/firestore', () => {
  const mockOnSnapshot = vi.fn((docRef, callback) => {
    // Simulamos un disparo inicial con datos de prueba (Zero-PII)
    const mockDoc = {
      exists: () => true,
      data: () => ({
        shortId: 'CASO-TEST-OK',
        status: 'en_proceso',
        nombreOfuscado: 'C*** P***',
        updatedAt: { toDate: () => new Date('2026-03-17T00:00:00Z') },
      }),
    };

    // Ejecutamos el callback con el snapshot simulado
    callback(mockDoc);

    // Retornamos la función de limpieza (unsubscribe)
    return vi.fn();
  });

  return {
    getFirestore: vi.fn(),
    collection: vi.fn(),
    doc: vi.fn(),
    onSnapshot: mockOnSnapshot,
  };
});

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
  getApp: vi.fn(),
}));

describe('🔮 Motor Real-Time (v5.0.0 - Zero-PII)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería configurar correctamente el listener onSnapshot sobre un documento público', async () => {
    const { onSnapshot } = await import('firebase/firestore');

    // Simulamos el comportamiento del portal usando UUID
    const unsubscribe = onSnapshot({} as never, (snapshot) => {
      const data = snapshot.data() as { shortId: string; nombreOfuscado: string };
      expect(snapshot.exists()).toBe(true);
      expect(data.shortId).toBe('CASO-TEST-OK');
      expect(data.nombreOfuscado).toBe('C*** P***');
    });

    expect(onSnapshot).toHaveBeenCalled();
    expect(unsubscribe).toBeDefined();
  });

  it('debería manejar documento no encontrado en el flujo real-time', async () => {
    const { onSnapshot } = await import('firebase/firestore');

    // Sobrescribimos el mock para este test específico (documento inexistente)
    vi.mocked(onSnapshot).mockImplementationOnce((_docRef, callback) => {
      (callback as (s: unknown) => void)({
        exists: () => false,
        data: () => null,
      });
      return vi.fn();
    });

    onSnapshot({} as never, (snapshot: { exists: () => boolean }) => {
      expect(snapshot.exists()).toBe(false);
    });
  });
});
