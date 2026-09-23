import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/payments/webhook-wompi/route';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

// Mock dependencias
vi.mock('@/lib/firebase-admin', () => ({
  getAdminApp: vi.fn(),
}));

const mockGet = vi.fn();
const mockSet = vi.fn();
const mockUpdate = vi.fn();
const mockCreate = vi.fn();

vi.mock('firebase-admin/firestore', () => {
  return {
    getFirestore: vi.fn(() => ({
      // [2026-09-22] El webhook usa una transacción (idempotencia + actualización atómica)
      runTransaction: vi.fn(async (fn: (tx: unknown) => unknown) =>
        fn({
          get: (ref: { get: () => unknown }) => ref.get(),
          update: (ref: { update: (d: unknown) => unknown }, d: unknown) => ref.update(d),
          create: (ref: { create: (d: unknown) => unknown }, d: unknown) => ref.create(d),
        })
      ),
      collection: vi.fn((collName) => ({
        doc: vi.fn((docId) => ({
          get: () => mockGet(collName, docId),
          set: mockSet,
          update: mockUpdate,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          create: (...args: any[]) => mockCreate(collName, docId, ...args),
        })),
      })),
    })),
    FieldValue: {
      serverTimestamp: vi.fn(),
    },
  };
});

vi.mock('@/lib/payments/pdf-delivery', () => ({
  generarYEnviarPDF: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/logger/security-logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    security: vi.fn(),
  },
}));

describe('Wompi Webhook API', () => {
  const SECRET = 'test_secret_123';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WOMPI_EVENTS_SECRET = SECRET;
    mockCreate.mockResolvedValue(undefined);
    mockGet.mockImplementation((collName: string, docId: string) => {
      if (collName === 'processed_callbacks') {
        return Promise.resolve({ exists: false, data: () => ({}) });
      }
      if (collName === 'purchases') {
        return Promise.resolve({
          exists: true,
          data: () => ({
            amountCop: 10000,
            productType: 'poder_especial',
            caseData: {
              shortId: docId,
              infractorName: 'Test Name',
            },
          }),
        });
      }
      return Promise.resolve({ exists: false, data: () => ({}) });
    });
  });

  it('debería rechazar peticiones con firma inválida (401)', async () => {
    const payload = JSON.stringify({
      event: 'transaction.updated',
      data: { transaction: { id: '123' } },
    });

    // Firma incorrecta
    const req = new NextRequest('http://localhost/api', {
      method: 'POST',
      body: payload,
      headers: {
        'x-event-checksum': 'invalid_signature_hash',
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json.error).toBe('Firma inválida');
  });

  it('debería procesar peticiones con firma válida y devolver 200', async () => {
    const timestamp = 1612345678;
    const basePayload = {
      event: 'transaction.updated',
      data: {
        transaction: {
          id: 'txn_123',
          reference: 'ref_123',
          status: 'APPROVED',
          amount_in_cents: 10000,
          currency: 'COP',
        },
      },
      timestamp,
      signature: {
        properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'],
      },
    };

    // Generar firma correcta (SHA256) según la concatenación dinámica de Wompi
    const concatenatedValues = 'txn_123' + 'APPROVED' + '10000' + String(timestamp) + SECRET;
    const expectedSignature = crypto.createHash('sha256').update(concatenatedValues).digest('hex');

    const payload = JSON.stringify({
      ...basePayload,
      signature: {
        ...basePayload.signature,
        checksum: expectedSignature,
      },
    });

    const req = new NextRequest('http://localhost/api', {
      method: 'POST',
      body: payload,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.status).toBe('APPROVED');
  });

  it('debería ignorar eventos que no sean transaction.updated', async () => {
    const timestamp = 1612345678;
    const basePayload = {
      event: 'nequi_token.updated',
      data: { transaction: { id: 'txn_123' } },
      timestamp,
      signature: { properties: ['transaction.id'] },
    };

    const concatenatedValues = 'txn_123' + String(timestamp) + SECRET;
    const expectedSignature = crypto.createHash('sha256').update(concatenatedValues).digest('hex');

    const payload = JSON.stringify({
      ...basePayload,
      signature: { ...basePayload.signature, checksum: expectedSignature },
    });

    const req = new NextRequest('http://localhost/api', {
      method: 'POST',
      body: payload,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ignored).toBe(true);
  });
});
