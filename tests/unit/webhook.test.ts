import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/payments/webhook-wompi/route';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

// Mock dependencias
vi.mock('@/lib/firebase-admin', () => ({
  getAdminApp: vi.fn(),
}));

vi.mock('firebase-admin/firestore', () => {
  const mockSet = vi.fn();
  const mockUpdate = vi.fn();
  const mockGet = vi.fn().mockResolvedValue({ exists: false, data: () => ({}) });
  const mockDoc = vi.fn(() => ({
    get: mockGet,
    set: mockSet,
    update: mockUpdate,
  }));
  const mockCollection = vi.fn(() => ({
    doc: mockDoc,
  }));
  return {
    getFirestore: vi.fn(() => ({
      collection: mockCollection,
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
  },
}));

describe('Wompi Webhook API', () => {
  const SECRET = 'test_secret_123';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WOMPI_EVENTS_SECRET = SECRET;
  });

  it('debería rechazar peticiones con firma inválida (401)', async () => {
    const payload = JSON.stringify({ event: 'transaction.updated', data: { transaction: { id: '123' } } });
    
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
    const payload = JSON.stringify({ 
      event: 'transaction.updated', 
      data: { 
        transaction: { id: 'txn_123', reference: 'ref_123', status: 'APPROVED' } 
      } 
    });
    
    // Generar firma correcta (SHA256) según la documentación de Wompi
    const expectedSignature = crypto
      .createHash('sha256')
      .update(payload + SECRET)
      .digest('hex');

    const req = new NextRequest('http://localhost/api', {
      method: 'POST',
      body: payload,
      headers: {
        'x-event-checksum': expectedSignature,
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.status).toBe('APPROVED');
  });
  
  it('debería ignorar eventos que no sean transaction.updated', async () => {
    const payload = JSON.stringify({ 
      event: 'nequi_token.updated', 
      data: {} 
    });
    
    const expectedSignature = crypto
      .createHash('sha256')
      .update(payload + SECRET)
      .digest('hex');

    const req = new NextRequest('http://localhost/api', {
      method: 'POST',
      body: payload,
      headers: {
        'x-event-checksum': expectedSignature,
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    
    const json = await res.json();
    expect(json.ignored).toBe(true);
  });
});
