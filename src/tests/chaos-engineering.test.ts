import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as createOrder } from '../app/api/payments/create-order/route';

// Mocks
vi.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/lib/security/ip-utils', () => ({
  getSecureIp: vi.fn().mockReturnValue('127.0.0.1'),
}));

vi.mock('@/lib/firebase-admin', () => ({
  getAdminApp: vi.fn(),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn().mockReturnValue({
    collection: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({ empty: true }),
      doc: vi.fn().mockReturnValue({
        create: vi.fn().mockResolvedValue({}),
      }),
    }),
  }),
  FieldValue: { serverTimestamp: vi.fn() },
}));

vi.mock('@/lib/security/server-crypto', () => ({
  hashPII: vi.fn().mockReturnValue('hashed_pii'),
}));

describe('Ingeniería del Caos (Pilar 3) - Wompi', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.WOMPI_INTEGRITY_SECRET = 'secret_test_123';
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it('Debe devolver 503 cuando CHAOS_SIMULATE_WOMPI_DOWN es true', async () => {
    process.env.CHAOS_SIMULATE_WOMPI_DOWN = 'true';

    const req = new NextRequest('http://localhost/api/payments/create-order', {
      method: 'POST',
      body: JSON.stringify({
        productType: 'peticion_general',
        customerEmail: 'test@example.com',
        cedula: '12345678',
        celular: '3001234567',
        caseData: {
          infractorName: 'Juan Perez',
          infractorId: '12345678',
          shortId: 'XYZ',
        },
      }),
    });

    const res = await createOrder(req);
    expect(res.status).toBe(503);

    const body = await res.json();
    expect(body.error).toContain('Chaos Engineering');
  });

  it('Debe funcionar normalmente cuando CHAOS_SIMULATE_WOMPI_DOWN es false o undefined', async () => {
    delete process.env.CHAOS_SIMULATE_WOMPI_DOWN;

    const req = new NextRequest('http://localhost/api/payments/create-order', {
      method: 'POST',
      body: JSON.stringify({
        productType: 'peticion_general',
        customerEmail: 'test@example.com',
        cedula: '12345678',
        celular: '3001234567',
        caseData: {
          infractorName: 'Juan Perez',
          infractorId: '12345678',
          shortId: 'XYZ',
        },
      }),
    });

    const res = await createOrder(req);
    expect(res.status).toBe(200);
  });
});

describe('Ingeniería del Caos (Pilar 3) - Middleware Firebase Auth', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it('Debe redirigir a acceso-panel cuando CHAOS_SIMULATE_AUTH_DROP es true', async () => {
    process.env.CHAOS_SIMULATE_AUTH_DROP = '"true"'; // Simular comillas de Vercel

    // Importamos middleware dinámicamente para que lea las variables mockeadas
    const { middleware } = await import('../middleware');

    const req = new NextRequest('http://localhost/admin/dashboard', {
      headers: new Headers({
        'user-agent': 'Mozilla/5.0',
      }),
    });
    // Mock de cookies
    req.cookies.set('__session', 'mock_session');
    req.cookies.set('admin-2fa-token', 'mock_2fa');

    const res = await middleware(req);
    expect(res.status).toBe(307); // Redirect temporal de Next.js
    expect(res.headers.get('location')).toContain('/acceso-panel');
  });
});
