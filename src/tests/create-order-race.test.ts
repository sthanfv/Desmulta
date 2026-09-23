import { describe, it, expect, vi, beforeEach } from 'vitest';
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
const mockGet = vi.fn(() => ({ empty: true }));
const mockLimit = vi.fn(() => ({ get: mockGet }));
const mockWhere = vi.fn(() => ({
  where: mockWhere,
  limit: mockLimit,
  get: mockGet,
}));

const mockCollection = vi.fn(() => ({
  doc: mockDoc,
  where: mockWhere,
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
  beforeEach(() => {
    vi.clearAllMocks();
  });
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

  it('Debe devolver la misma orden (idempotencia) ante un doble clic del MISMO navegador (cookie dt_)', async () => {
    // Simulamos que ya existe una orden previa creada recientemente
    const mockExistingOrder = {
      wompiReference: 'DSM-REF-DUPLICADA-123',
      downloadToken: 'token-secreto-xyz',
      createdAt: new Date(),
    };

    const mockGetExisting = vi.fn().mockResolvedValue({
      empty: false,
      docs: [{ data: () => mockExistingOrder }],
    });

    const mockLimitIdemp = vi.fn(() => ({ get: mockGetExisting }));
    const mockWhereIdemp = vi.fn(() => ({
      where: mockWhereIdemp,
      limit: mockLimitIdemp,
      get: mockGetExisting,
    }));

    // El mock responderá que YA HAY un registro con ese Idempotency Key
    mockCollection.mockReturnValueOnce({
      where: mockWhereIdemp,
    });

    const req = new Request('http://localhost/api/payments/create-order', {
      method: 'POST',
      body: JSON.stringify({
        productType: 'peticion_general',
        customerEmail: 'test@example.com',
        cedula: '987654321', // fingerprint usa cedula y productType
        celular: '3001234567',
        caseData: {
          infractorName: 'Maria Gomez',
          infractorId: '987654321',
          shortId: 'SHORT-999', // A pesar del shortId, debe dar idempotencia
        },
      }),
    }) as any;
    req.nextUrl = { origin: 'http://localhost' };
    // [2026-09-22] La reutilización exige que el navegador presente la cookie dt_ de esa orden
    req.cookies = {
      get: (name: string) =>
        name === 'dt_DSM-REF-DUPLICADA-123' ? { value: 'token-secreto-xyz' } : undefined,
    };

    await POST(req);

    // Se debe haber respondido con la referencia original en vez de crear una nueva
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        wompiReference: 'DSM-REF-DUPLICADA-123',
      })
    );

    // No debe haber llamado a crear una nueva orden
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('NO debe entregar la orden existente (ni su cookie) a otro navegador que solo conoce la cédula', async () => {
    const mockGetExisting = vi.fn().mockResolvedValue({
      empty: false,
      docs: [
        {
          data: () => ({
            wompiReference: 'DSM-REF-VICTIMA-1',
            downloadToken: 'token-de-la-victima',
            createdAt: new Date(),
          }),
        },
      ],
    });
    const mockWhereIdemp = vi.fn(() => ({
      where: mockWhereIdemp,
      limit: vi.fn(() => ({ get: mockGetExisting })),
      get: mockGetExisting,
    }));
    mockCollection.mockReturnValueOnce({ where: mockWhereIdemp });
    mockDoc.mockReturnValue({ id: 'nueva', create: mockCreate });
    process.env.WOMPI_INTEGRITY_SECRET = 'test-secret';

    const req = new Request('http://localhost/api/payments/create-order', {
      method: 'POST',
      body: JSON.stringify({
        productType: 'peticion_general',
        customerEmail: 'test@example.com',
        cedula: '987654321',
        celular: '3001234567',
        caseData: { infractorName: 'Maria Gomez', infractorId: '987654321', shortId: 'X1' },
      }),
    }) as any;
    req.nextUrl = { origin: 'http://localhost' };
    req.cookies = { get: () => undefined };

    await POST(req);

    expect(mockJson).not.toHaveBeenCalledWith(
      expect.objectContaining({ wompiReference: 'DSM-REF-VICTIMA-1' })
    );
    expect(mockCreate).toHaveBeenCalled();
  });
});
