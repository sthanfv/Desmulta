import { describe, it, expect, vi, beforeEach } from 'vitest';
import test from 'firebase-functions-test';

// 1. Configurar Mocks
const mocks = vi.hoisted(() => {
  return {
    mockFirestoreGet: vi.fn(),
    mockBatchDelete: vi.fn(),
    mockBatchCommit: vi.fn(),
    mockBlobList: vi.fn(),
    mockBlobDel: vi.fn(),
  };
});

vi.mock('@vercel/blob', () => ({
  list: mocks.mockBlobList,
  del: mocks.mockBlobDel,
}));

vi.mock('firebase-admin', () => {
  const batch = {
    delete: mocks.mockBatchDelete,
    commit: mocks.mockBatchCommit,
  };

  const query = {
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: mocks.mockFirestoreGet,
  };

  const firestoreMock = vi.fn(() => ({
    collection: vi.fn(() => query),
    collectionGroup: vi.fn(() => query),
    batch: vi.fn(() => batch),
  }));

  return {
    default: {
      firestore: firestoreMock,
      apps: ['mock'],
      initializeApp: vi.fn()
    },
    firestore: Object.assign(firestoreMock, {
      Timestamp: {
        fromDate: vi.fn((d) => d),
        now: vi.fn(() => new Date()),
        fromMillis: vi.fn((m) => new Date(m)),
      }
    }),
  };
});

vi.mock('firebase-functions', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  };
});

import { cronLimpieza } from '../cronCleanup';

const testEnv = test();

describe('cronCleanup - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BLOB_READ_WRITE_TOKEN = 'blob_token';

    // Simular que siempre encuentra documentos para borrar
    mocks.mockFirestoreGet.mockResolvedValue({
      empty: false,
      size: 2,
      docs: [
        { id: 'push', ref: 'ref1', data: vi.fn(() => ({})) },
        { id: 'other', ref: 'ref2', data: vi.fn(() => ({})) }
      ]
    });

    mocks.mockBatchCommit.mockResolvedValue(undefined);
    
    // Simular un blob viejo de hace 10 días
    mocks.mockBlobList.mockResolvedValue({
      blobs: [
        { url: 'https://blob.com/viejito.jpg', uploadedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() }
      ]
    });
  });

  it('debe ejecutar las purgas de Firestore y Vercel Blob', async () => {
    const wrapped = testEnv.wrap(cronLimpieza as any);
    
    await wrapped({});

    // 8 colecciones purgadas (6 de rate limits, consultations, tokens push inactivos)
    // Nota: Algunas las gestiona el TTL nativo, pero COLLECTIONS_TO_CLEAN tiene 6
    expect(mocks.mockFirestoreGet).toHaveBeenCalledTimes(8);
    expect(mocks.mockBatchDelete).toHaveBeenCalled();
    // 8 commits: uno por cada colección de COLLECTIONS_TO_CLEAN, uno por consultations, uno por tokens push
    expect(mocks.mockBatchCommit).toHaveBeenCalledTimes(8);

    // Purga de blobs
    expect(mocks.mockBlobList).toHaveBeenCalled();
    expect(mocks.mockBlobDel).toHaveBeenCalledWith(
      ['https://blob.com/viejito.jpg'],
      expect.objectContaining({ token: 'blob_token' })
    );
  });

  it('NO debe purgar blobs si no hay token configurado', async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    const wrapped = testEnv.wrap(cronLimpieza as any);
    
    await wrapped({});

    expect(mocks.mockBlobList).not.toHaveBeenCalled();
  });
});
