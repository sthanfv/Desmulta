import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCaseByTrackingUuid } from '@/app/actions';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Mock de Firebase Admin
vi.mock('firebase-admin/firestore', () => {
  class MockTimestamp {
    constructor(private date: Date) {}
    toDate() {
      return this.date;
    }
    static fromDate(date: Date) {
      return new MockTimestamp(date);
    }
  }

  const mockGet = vi.fn();
  const mockDoc = vi.fn(() => ({
    get: mockGet,
  }));
  const mockCollection = vi.fn(() => ({
    doc: mockDoc,
  }));

  return {
    getFirestore: vi.fn(() => ({
      collection: mockCollection,
    })),
    Timestamp: MockTimestamp,
  };
});

vi.mock('@/lib/firebase-admin', () => ({
  getAdminApp: vi.fn(),
}));

vi.mock('@/lib/logger/security-logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('🛰️ Portal de Monitoreo (v5.0.0 - Zero-PII)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería retornar un caso encontrado por su trackingUuid', async () => {
    const mockDb = getFirestore();
    const mockData = {
      shortId: 'CASO-001',
      status: 'en_proceso',
      nombreOfuscado: 'J***',
      updatedAt: (Timestamp as unknown as { fromDate: (d: Date) => unknown }).fromDate(
        new Date('2026-03-17T00:00:00Z')
      ),
    };

    const mockCollection = vi.mocked(mockDb.collection);
    mockCollection.mockReturnValue({
      doc: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValueOnce({
        exists: true,
        data: () => mockData,
      }),
    } as unknown as ReturnType<typeof mockDb.collection>);

    const result = await getCaseByTrackingUuid('test-uuid-123');

    expect(result.success).toBe(true);
    if ('case' in result && result.case) {
      expect(result.case.shortId).toBe('CASO-001');
      expect(result.case.nombre).toBe('J***');
      expect(result.case.status).toBe('en_proceso');
    }
  });

  it('debería retornar error si el UUID no existe en public_tracking', async () => {
    const mockDb = getFirestore();

    vi.mocked(mockDb.collection).mockReturnValue({
      doc: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValueOnce({
        exists: false,
      }),
    } as unknown as ReturnType<typeof mockDb.collection>);

    const result = await getCaseByTrackingUuid('non-existent-uuid');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Seguimiento no encontrado');
  });
});
