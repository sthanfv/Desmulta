import { consolidarExpedienteEnDB } from '@/app/actions/expediente.actions';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger/security-logger';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// Mock estricto de infraestructura externa (Firebase y Logger)
vi.mock('@/lib/firebase-admin', () => ({
  getAdminApp: vi.fn(),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(),
  FieldValue: {
    serverTimestamp: vi.fn(() => 'MOCKED_TIMESTAMP'),
    increment: vi.fn((val) => val),
    arrayUnion: vi.fn((...args) => args),
  },
}));

vi.mock('@/lib/logger/security-logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/security/server-crypto', () => ({
  hashPII: vi.fn((val) => `HASHED_${val}`),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Map([['x-forwarded-for', '127.0.0.1']])),
  cookies: vi.fn(async () => ({ get: vi.fn() })),
}));

describe('QA FinOps & DB: consolidarExpedienteEnDB', () => {
  const mockCollection = vi.fn();
  const mockWhere = vi.fn();
  const mockLimit = vi.fn();
  const mockGet = vi.fn();
  const mockAdd = vi.fn();
  const mockDoc = vi.fn();
  const mockUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Configuración de la cadena de Firestore
    (getFirestore as Mock).mockReturnValue({
      collection: mockCollection.mockReturnValue({
        where: mockWhere.mockReturnValue({
          limit: mockLimit.mockReturnValue({
            get: mockGet,
          }),
        }),
        add: mockAdd,
        doc: mockDoc.mockReturnValue({
          update: mockUpdate,
        }),
      }),
    });
  });

  const basePayload = {
    cedula: '1234567890',
    telefono: '3000000000',
    nombre: 'Usuario Test',
    turnstileToken: 'mock-valid-token-12345',
    nuevasMultas: [{ comparendo: 'C001', fecha: '2026-01-01', valor: 500000, estado: 'PENDIENTE' }],
  };

  it('debe crear un expediente maestro nuevo si la cédula no existe (Caso A)', async () => {
    mockGet.mockResolvedValueOnce({ empty: true });
    mockAdd.mockResolvedValueOnce({ id: 'NEW_DOC_ID' });

    const result = await consolidarExpedienteEnDB(basePayload);

    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        cedulaHash: 'HASHED_1234567890',
        telefonoHash: 'HASHED_3000000000',
        estado_gestion: 'NUEVO',
        total_deuda_acumulada: 500000,
      })
    );
    expect(result).toEqual({
      success: true,
      status: 'creado',
      message: 'Expediente maestro creado.',
    });
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('[FinOps] Nuevo expediente creado (Zero-PII):'),
      expect.any(Object)
    );
  });

  it('debe actualizar (MERGE) el expediente si la cédula ya existe (Caso B)', async () => {
    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [{ id: 'EXISTING_DOC_ID' }],
    });

    const result = await consolidarExpedienteEnDB(basePayload);

    expect(mockDoc).toHaveBeenCalledWith('EXISTING_DOC_ID');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        telefonoHash: 'HASHED_3000000000',
        total_deuda_acumulada: 500000, // Evaluando el mock de FieldValue.increment
        multas_registradas: basePayload.nuevasMultas, // Evaluando el mock de FieldValue.arrayUnion
      })
    );
    expect(result).toEqual({
      success: true,
      status: 'actualizado',
      message: 'Expediente actualizado con nuevas infracciones.',
    });
  });

  it('debe propagar la excepción si ocurre un fallo crítico de infraestructura', async () => {
    const dbError = new Error('Falla de red en Firestore');
    mockGet.mockRejectedValueOnce(dbError);

    await expect(consolidarExpedienteEnDB(basePayload)).rejects.toThrow(
      'Falla de red en Firestore'
    );
  });
});
