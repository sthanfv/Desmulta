import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/qstash/dlq-pdf-delivery/route';

// 1. Mock de Firebase Admin y Firestore
const mockGet = vi.fn();
const mockLimit = vi.fn().mockReturnThis();
const mockOrderBy = vi.fn().mockReturnThis();
const mockWhere = vi.fn().mockReturnThis();
const mockCollection = vi.fn(() => ({
  where: mockWhere,
  orderBy: mockOrderBy,
  limit: mockLimit,
  get: mockGet,
}));

vi.mock('@/lib/firebase-admin', () => ({
  getAdminApp: vi.fn(() => ({})), // Devuelve app mockeada
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: mockCollection,
  })),
  Timestamp: {
    fromDate: vi.fn((date) => ({ toDate: () => date })),
  },
  FieldValue: {
    serverTimestamp: vi.fn(),
  },
}));

// 2. Mock de funciones de entrega y serverless
const mockGenerarYEnviarPDF = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/payments/pdf-delivery', () => ({
  generarYEnviarPDF: (...args: any[]) => mockGenerarYEnviarPDF(...args),
}));

vi.mock('@vercel/functions', () => ({
  waitUntil: vi.fn((promise) => {
    // Para tests simulamos que la promesa se ejecuta
    return promise;
  }),
}));

// 3. Mock de QStash Validator (Bypass para poder testear la lógica interna)
vi.mock('@upstash/qstash/nextjs', () => ({
  verifySignatureAppRouter: (handler: any) => {
    return async (req: NextRequest, ...args: any[]) => {
      const authHeader = req.headers.get('upstash-signature');
      if (!authHeader || authHeader !== 'valid-signature') {
        return new Response(JSON.stringify({ error: 'Firma QStash inválida' }), { status: 401 });
      }
      return handler(req, ...args);
    };
  },
}));

describe('DLQ PDF Delivery - Cron Job (QStash)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe rechazar la petición si no tiene una firma válida de QStash', async () => {
    const req = new NextRequest('http://localhost/api/qstash/dlq-pdf-delivery', {
      method: 'GET',
      headers: {
        'upstash-signature': 'invalid-or-missing',
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Firma QStash inválida');
  });

  it('debe retornar processed: 0 si no hay compras atascadas', async () => {
    mockGet.mockResolvedValueOnce({
      empty: true,
      forEach: vi.fn(),
    });

    const req = new NextRequest('http://localhost/api/qstash/dlq-pdf-delivery', {
      method: 'GET',
      headers: {
        'upstash-signature': 'valid-signature',
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.processed).toBe(0);
    expect(data.ok).toBe(true);

    // Verificamos que se construyó bien la query a Firestore
    expect(mockWhere).toHaveBeenCalledWith('status', '==', 'APPROVED');
    expect(mockWhere).toHaveBeenCalledWith('paidAt', '<=', expect.anything());
    expect(mockGenerarYEnviarPDF).not.toHaveBeenCalled();
  });

  it('debe procesar y enviar PDF solo para las compras sin pdfDeliveredAt', async () => {
    // Simulamos 2 compras retornadas por Firestore:
    // Una ya fue entregada (tiene pdfDeliveredAt), la otra NO (falla de resend previa)
    const mockDocs = [
      {
        data: () => ({
          id: 'compra-1',
          status: 'APPROVED',
          wompiReference: 'DSM-1',
          // NO tiene pdfDeliveredAt
        }),
      },
      {
        data: () => ({
          id: 'compra-2',
          status: 'APPROVED',
          wompiReference: 'DSM-2',
          pdfDeliveredAt: { seconds: 123456 }, // YA ENTREGADA (falso positivo de query)
        }),
      },
    ];

    mockGet.mockResolvedValueOnce({
      empty: false,
      forEach: (cb: (doc: any) => void) => mockDocs.forEach(cb),
    });

    const req = new NextRequest('http://localhost/api/qstash/dlq-pdf-delivery', {
      method: 'GET',
      headers: {
        'upstash-signature': 'valid-signature',
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    // Solo 1 compra debió ser procesada (la que no tiene pdfDeliveredAt)
    expect(data.processed).toBe(1);
    expect(data.ok).toBe(true);

    // Verificamos que se llamó a generarYEnviarPDF solo para compra-1
    expect(mockGenerarYEnviarPDF).toHaveBeenCalledTimes(1);
    expect(mockGenerarYEnviarPDF.mock.calls[0][0].id).toBe('compra-1');
  });
});
