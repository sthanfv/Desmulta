import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getConsultationActivity } from '../app/actions/user-activity.actions';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '../lib/firebase-admin';

// Mock de Firebase Admin
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(),
}));

vi.mock('../lib/firebase-admin', () => ({
  getAdminApp: vi.fn(),
}));

vi.mock('../lib/security/server-crypto', () => ({
  hashPII: vi.fn((val) => `HASH:${val}`),
}));

vi.mock('../lib/logger/security-logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue('127.0.0.1'),
  }),
}));

vi.mock('../lib/security/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
}));

describe('User Activity Actions — getConsultationActivity', () => {
  const mockCedula = '10904586653';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🚫 Debe retornar error si la cédula es muy corta', async () => {
    const result = await getConsultationActivity('123');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Número de cédula inválido.');
  });

  it('🚫 Debe retornar error si la cédula tiene letras y queda muy corta', async () => {
    const result = await getConsultationActivity('123AB');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Formato de cédula inválido.');
  });

  it('✅ Debe retornar datos vacíos si no encuentra registros', async () => {
    const mockDocs: unknown[] = [];
    const mockQuery = {
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({ docs: mockDocs }),
    };

    const mockDb = {
      collection: vi.fn().mockReturnValue(mockQuery),
    };

    vi.mocked(getFirestore).mockReturnValue(mockDb as never);

    const result = await getConsultationActivity(mockCedula);

    expect(result.success).toBe(true);
    expect(result.data?.tieneDatos).toBe(false);
    expect(result.data?.totalDeuda).toBe(0);
  });

  it('✅ Debe retornar datos si encuentra consultas y casos', async () => {
    const mockConsultations = [
      {
        id: 'cons1',
        data: () => ({
          shortId: 'C1',
          status: 'exitoso',
          total_deuda_acumulada: 500000,
          createdAt: { toDate: () => new Date() },
        }),
      },
    ];

    const mockCases = [
      {
        id: 'case1',
        data: () => ({
          shortId: 'CAS1',
          status: 'En proceso',
        }),
      },
    ];

    const mockQueryConsultations = {
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({ docs: mockConsultations }),
    };

    const mockQueryCases = {
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({ docs: mockCases }),
    };

    const mockDb = {
      collection: vi.fn().mockImplementation((name) => {
        if (name === 'consultations') return mockQueryConsultations;
        if (name === 'cases') return mockQueryCases;
        return null;
      }),
    };

    vi.mocked(getFirestore).mockReturnValue(mockDb as never);

    const result = await getConsultationActivity(mockCedula);

    expect(result.success).toBe(true);
    expect(result.data?.tieneDatos).toBe(true);
    expect(result.data?.totalDeuda).toBe(500000);
    expect(result.data?.conteoConsultas).toBe(1);
    expect(result.data?.conteoCasos).toBe(1);
    expect(result.data?.consultasRecientes[0].id).toBe('cons1');
    expect(result.data?.casosActivos[0].id).toBe('case1');
  });
});
