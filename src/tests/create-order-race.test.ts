import { describe, it, expect, vi } from 'vitest';
import { POST } from '../app/api/payments/create-order/route';

// Mock de NextResponse
const mockJson = vi.fn((data, options) => ({
  data,
  options,
  cookies: { set: vi.fn() },
}));
vi.mock('next/server', () => ({
  NextResponse: {
    json: (...args: any[]) => mockJson(...args),
  },
}));

// Mock de Firebase
vi.mock('@/lib/firebase-admin', () => ({
  getAdminApp: vi.fn(),
}));

const mockCreate = vi.fn();
const mockDoc = vi.fn(() => ({
  create: mockCreate,
}));
const mockCollection = vi.fn(() => ({
  doc: mockDoc,
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: mockCollection,
  })),
  FieldValue: {
    serverTimestamp: vi.fn(() => 'timestamp'),
  },
}));

// Mock de utilidades y fetch
vi.mock('@/lib/security/ip-utils', () => ({
  getSecureIp: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  rateLimit: vi.fn(async () => ({ success: true })),
  checkRateLimit: vi.fn(async () => ({ success: true })),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Prevención de Race Conditions en Wompi (Hallazgo 1)', () => {
  it('Debe generar un wompiReference único (UUID) en vez de usar el nombre de la colección', async () => {
    mockDoc.mockReturnValue({ id: 'uuid-unico', create: mockCreate });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: 'wompi-id-123',
          created_at: '2026-01-01T00:00:00Z',
        },
      }),
    });

    process.env.WOMPI_INTEGRITY_SECRET = 'test-secret';

    const req = new Request('http://localhost/api/payments/create-order', {
      method: 'POST',
      body: JSON.stringify({
        productType: 'peticion_general',
        customerEmail: 'test@example.com',
        cedula: '123456789',
        celular: '3001234567',
        caseData: {
          infractorName: 'Juan Perez',
          infractorId: '123456789',
          shortId: 'SHORT-123',
        },
      }),
    }) as any;
    req.nextUrl = { origin: 'http://localhost' };

    const res = (await POST(req)) as any;

    // Verificamos que se llame a collection('purchases')
    expect(mockCollection).toHaveBeenCalledWith('purchases');
    // Verificamos que doc() se llame con el UUID y se use create()
    expect(mockDoc).toHaveBeenCalledWith(expect.stringMatching(/^DSM-/));
    expect(mockCreate).toHaveBeenCalled();

    // Verificamos que se retorna el UUID en la respuesta
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        wompiReference: expect.stringMatching(/^DSM-/),
      })
    );
  });
});
