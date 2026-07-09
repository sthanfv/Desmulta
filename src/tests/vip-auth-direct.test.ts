// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../app/api/vip/auth/route';
import { NextRequest } from 'next/server';

// ── 1. Mocks de Infraestructura ──────────────────────────────────────────────

const mockDocRef = {
  get: vi.fn(),
  update: vi.fn(),
};

const mockDocs = [
  {
    exists: true,
    data: () => ({
      contacto: 'ENC:3113114357',
      contactoHash: 'HASH:3113114357',
    }),
  },
];

const mockGet = vi.fn().mockResolvedValue({
  empty: false,
  forEach: (cb: any) => mockDocs.forEach(cb),
});

const mockQuery = {
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  get: mockGet,
};

const mockCollection = vi.fn(() => mockQuery);

vi.mock('firebase-admin/firestore', () => {
  return {
    getFirestore: vi.fn(() => ({
      collection: mockCollection,
    })),
  };
});

vi.mock('@/lib/firebase-admin', () => ({
  getAdminApp: vi.fn(),
}));

vi.mock('@/lib/security/server-crypto', () => ({
  hashPII: vi.fn((val) => {
    const result = `HASH:${val}`;
    console.log(`[TEST DEBUG] hashPII(${val}) => ${result}`);
    return result;
  }),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  rateLimit: vi.fn(() => Promise.resolve({ success: true, reset: 0, isError: false })),
}));

vi.mock('@/lib/security/vip-jwt', () => ({
  signVipSession: vi.fn(() => Promise.resolve('mock-vip-session-token')),
}));

describe('🛡️ VIP Auth Direct Login Regression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Debe iniciar sesión directamente, establecer cookie y redirigir al coincidir CC y celular', async () => {
    const mockRequest = new NextRequest('http://localhost/api/vip/auth', {
      method: 'POST',
      body: JSON.stringify({
        cedula: '1090458668',
        celular: '3113114357',
      }),
    });

    const response = await POST(mockRequest);
    console.log('mockGet calls:', mockGet.mock.calls.length);
    console.log('mockCollection calls:', mockCollection.mock.calls.length);
    if (response.status !== 200) {
      console.log('API Error response:', await response.json());
    }
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.redirect).toBe('/vip/dashboard');

    // Verificar que estableció la cookie _vip_session
    const cookieHeader = response.headers.get('Set-Cookie');
    expect(cookieHeader).toContain('_vip_session=mock-vip-session-token');
  });
});
