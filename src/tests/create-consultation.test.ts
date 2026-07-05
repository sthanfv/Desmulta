import { describe, it, expect, vi } from 'vitest';
import { POST } from '../app/api/create-consultation/route';
import { NextRequest } from 'next/server';

// Mock de Firestore con soporte recursivo de subcolecciones
const mockDocRef = {
  collection: vi.fn(),
};

const mockCollectionRef = {
  doc: vi.fn(() => mockDocRef),
};

// Configurar recursión
mockDocRef.collection.mockReturnValue(mockCollectionRef);

vi.mock('firebase-admin/firestore', () => {
  const transactionMock = {
    set: vi.fn(),
    get: vi.fn().mockResolvedValue({ exists: false, data: () => ({ count: 0 }) }),
  };

  return {
    getFirestore: vi.fn(() => ({
      runTransaction: vi.fn((callback) => callback(transactionMock)),
      collection: vi.fn(() => mockCollectionRef),
    })),
    FieldValue: {
      serverTimestamp: vi.fn(),
      increment: vi.fn(),
    },
  };
});

vi.mock('@/lib/security/server-crypto', () => ({
  decryptE2EPayload: vi.fn(),
  encryptSymmetric: vi.fn((val) => `ENC:${val}`),
  hashPII: vi.fn((val) => `HASH:${val}`),
}));

// Mock para evitar errores de autenticación/headers en el test
vi.mock('@/lib/auth/require-admin-session', () => ({
  requireAdminOrService: vi.fn(() => Promise.resolve({ role: 'admin' })),
}));

vi.mock('@/lib/firebase-admin', () => ({
  getAdminApp: vi.fn(),
}));

// Mock del Rate Limiter para aislar la prueba
vi.mock('@/lib/security/rate-limit', () => ({
  rateLimit: vi.fn(() => Promise.resolve({ success: true, reset: 0, isError: false })),
  checkRateLimit: vi.fn(() =>
    Promise.resolve({
      success: true,
      blocked: false,
      limit: 5,
      remaining: 5,
      resetTime: 0,
      isError: false,
    })
  ),
}));

describe('API Route: create-consultation (Hash Regression)', () => {
  it('Debe usar el hash derivado de la cédula en crudo, y NO de la encriptada', async () => {
    const mockRequest = new NextRequest('http://localhost/api/create-consultation', {
      method: 'POST',
      body: JSON.stringify({
        cedula: '12345678',
        placa: 'AAA123',
        nombre: 'Juan Perez',
        contacto: '3001234567',
        aceptoTerminos: true,
        antiguedad: 'mas_de_3_anos',
        tipoInfraccion: 'transito',
        estadoCoactivo: 'no',
        authorUid: 'user_123',
        cfToken: 'dummy_token', // Provisto para Turnstile
      }),
    });

    const response = await POST(mockRequest);
    expect(response.status).toBe(201); // Retorna 201 en creación exitosa
  });
});
