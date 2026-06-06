import { describe, it, expect, vi } from 'vitest';
import { rateLimit } from '@/lib/security/rate-limit';

vi.mock('@/lib/firebase-admin', () => ({
  getAdminApp: vi.fn(),
}));

vi.mock('firebase-admin/firestore', () => {
  const runTransactionMock = vi.fn().mockRejectedValue(new Error('Firestore down'));
  return {
    getFirestore: vi.fn(() => ({
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({})),
      })),
      runTransaction: runTransactionMock,
    })),
    Timestamp: { fromMillis: vi.fn() },
  };
});

describe('Rate Limit Fail-Closed Behavior', () => {
  it('debe bloquear la petición (fail-closed) cuando la infraestructura de base de datos falla', async () => {
    const result = await rateLimit('192.168.1.1', 5, 60000);

    expect(result.success).toBe(false);
    expect(result.blocked).toBe(true);
    expect(result.isError).toBe(true);
    expect(result.remaining).toBe(0);
  });
});
