// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── 1. Mocks de Infraestructura ──────────────────────────────────────────────

const mockSetCookie = vi.fn();
const mockGetCookie = vi.fn();

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    set: mockSetCookie,
    get: mockGetCookie,
  })),
  headers: vi.fn(async () => new Map()),
}));

vi.mock('@/lib/firebase-admin', () => ({
  getAdminApp: vi.fn(),
}));

vi.mock('firebase-admin/firestore', () => {
  const mockGet = vi.fn();
  const mockSet = vi.fn();
  const mockUpdate = vi.fn();
  const mockDoc = vi.fn(() => ({ get: mockGet, set: mockSet, update: mockUpdate }));
  const mockLimit = vi.fn(() => ({ get: mockGet }));
  const mockWhere = vi.fn(() => ({ where: vi.fn(() => ({ limit: mockLimit })) }));
  const mockCollection = vi.fn(() => ({ where: mockWhere, doc: mockDoc }));

  const mockRunTransaction = vi.fn(async (cb) => {
    return cb({
      get: vi.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
      set: mockSet,
      update: mockUpdate,
    });
  });

  return {
    getFirestore: vi.fn(() => ({ collection: mockCollection, runTransaction: mockRunTransaction })),
    Timestamp: { fromMillis: vi.fn((m) => m) },
  };
});

import { loginClientPortal } from '@/app/estado/actions';
import { signPortalSession, verifyPortalSession, hashPII } from '@/lib/security/server-crypto';
import { middleware } from '@/middleware';
import { getFirestore } from 'firebase-admin/firestore';

describe('🛡️ ADR-001 & Portal Session Security (JWT HS256 & Timing Attack)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLIENT_PORTAL_JWT_SECRET =
      'd042cacfea4bf3c261c2517db7669474cd1d92023963d84e676866f7e1d99c9f78e507373b52a4524f0707dc47361aea83626029a0a04e4e4529e1ecbf5017cc';
    process.env.PII_HMAC_SECRET = 'test_secret_salt_12345';
  });

  describe('1. Criptografía Servidor (signPortalSession / verifyPortalSession)', () => {
    it('debe firmar y verificar correctamente un trackingUuid', async () => {
      const trackingUuid = 'case-uuid-889900';
      const token = await signPortalSession(trackingUuid);

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // Header.Payload.Signature

      const verifiedUuid = await verifyPortalSession(token);
      expect(verifiedUuid).toBe(trackingUuid);
    });

    it('debe retornar null al intentar verificar un token alterado o inválido', async () => {
      const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.sig';
      const verifiedUuid = await verifyPortalSession(invalidToken);
      expect(verifiedUuid).toBeNull();
    });
  });

  describe('2. Server Actions — loginClientPortal (Zero-PII & Delay Constante)', () => {
    it('debe autenticar exitosamente, emitir cookie HttpOnly y respetar el delay de 300ms', async () => {
      const formData = new FormData();
      formData.append('cedula', '12345678');
      formData.append('contacto', '3001234567');

      const mockDb = getFirestore();
      const mockCollection = vi.mocked(mockDb.collection);

      const mockDocs = [{ data: () => ({ trackingUuid: 'valid-tracking-uuid' }) }];
      const mockGet = vi.fn().mockResolvedValueOnce({ empty: false, docs: mockDocs });
      const mockLimit = vi.fn(() => ({ get: mockGet }));
      const mockWhere2 = vi.fn(() => ({ limit: mockLimit }));
      const mockWhere1 = vi.fn(() => ({ where: mockWhere2 }));
      mockCollection.mockReturnValue({
        where: mockWhere1,
        doc: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), update: vi.fn() })),
      } as unknown as ReturnType<typeof mockDb.collection>);

      const startTime = Date.now();
      const result = await loginClientPortal(formData);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeGreaterThanOrEqual(300); // Timing attack prevention
      expect(result.success).toBe(true);
      expect(result.trackingUuid).toBe('valid-tracking-uuid');

      // Aserción de que seteó la cookie correctamente
      expect(mockSetCookie).toHaveBeenCalledWith(
        '_portal_session',
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
          maxAge: 4 * 60 * 60,
        })
      );
    });

    it('debe rechazar credenciales inválidas y aun así respetar el delay de 300ms', async () => {
      const formData = new FormData();
      formData.append('cedula', '00'); // inválido por Zod schema

      const startTime = Date.now();
      const result = await loginClientPortal(formData);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeGreaterThanOrEqual(300);
      expect(result.success).toBe(false);
      // El mensaje puede variar según zod (e.g. "Required" o "String must contain..."), verificamos que sea string
      expect(typeof result.error).toBe('string');
    });
  });
});
