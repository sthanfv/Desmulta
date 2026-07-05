import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks de infraestructura
vi.mock('@/lib/firebase-admin', () => ({
  getAdminApp: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn) => fn),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(),
  Timestamp: class {
    constructor(
      public seconds: number,
      public nanoseconds: number
    ) {}
    toDate() {
      return new Date(this.seconds * 1000);
    }
  },
  FieldValue: { serverTimestamp: vi.fn() },
}));

vi.mock('@/lib/auth/require-admin-session', () => ({
  requireAdminSession: vi.fn().mockResolvedValue({ uid: 'admin-mock' }),
}));

vi.mock('@/lib/legal/pdf-engine', () => ({
  generateMandatePDF: vi.fn().mockResolvedValue(
    // Buffer mínimo de PDF válido ('%PDF-')
    new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52])
  ),
}));

import { generarPoderLegal } from '@/app/admin/actions';
import { getFirestore } from 'firebase-admin/firestore';
import { generateMandatePDF } from '@/lib/legal/pdf-engine';

// Datos de un caso real simulado en Firestore
const mockCaseData = {
  nombre: 'Carlos Perez',
  cedula: '1099887766',
  placa: 'ABC123',
  shortId: 'CASO-042',
  createdAt: '2024-03-15T10:30:00.000Z',
  ticketNumber: 'COMP-0099',
};

const buildFirestoreMock = (data: typeof mockCaseData | null) => ({
  collection: vi.fn(() => ({
    doc: vi.fn(() => ({
      get: vi.fn().mockResolvedValue({
        exists: data !== null,
        data: () => data,
      }),
      update: vi.fn().mockResolvedValue({}),
    })),
  })),
});

describe('generarPoderLegal — Server Action del Motor PDF Admin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('DEFAULT_OPERATOR_NAME', 'Operador Test Desmulta');
    vi.stubEnv('DEFAULT_OPERATOR_ID', '9988776655');
  });

  it('debe retornar error si el caso no existe ni en cases ni en consultations', async () => {
    vi.mocked(getFirestore).mockReturnValue(
      buildFirestoreMock(null) as unknown as ReturnType<typeof getFirestore>
    );

    const result = await generarPoderLegal('token-valido', 'id-inexistente');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Caso no encontrado en la base de datos.');
    }
  });

  it('debe generar el PDF y retornar base64 válido cuando el caso existe', async () => {
    vi.mocked(getFirestore).mockReturnValue(
      buildFirestoreMock(mockCaseData) as unknown as ReturnType<typeof getFirestore>
    );

    const result = await generarPoderLegal('token-valido', 'caso-real-id');

    expect(result.success).toBe(true);
    if (result.success) {
      // Verificar que el base64 es una cadena no vacía y decodificable
      expect(typeof result.base64).toBe('string');
      expect(result.base64.length).toBeGreaterThan(0);
      expect(() => Buffer.from(result.base64, 'base64')).not.toThrow();

      // Verificar que el nombre del archivo contiene la placa o cédula
      expect(result.filename).toContain('ABC123');
      expect(result.filename).toMatch(/\.pdf$/);
    }
  });

  it('debe pasar los datos correctos del caso al motor PDF', async () => {
    vi.mocked(getFirestore).mockReturnValue(
      buildFirestoreMock(mockCaseData) as unknown as ReturnType<typeof getFirestore>
    );

    await generarPoderLegal('token-valido', 'caso-real-id');

    expect(generateMandatePDF).toHaveBeenCalledWith(
      expect.objectContaining({
        infractorName: 'Carlos Perez',
        infractorId: '1099887766',
        licensePlate: 'ABC123',
        shortId: 'CASO-042',
        operatorName: 'Operador Test Desmulta',
        operatorId: '9988776655',
      })
    );
  });

  it('debe usar variables de entorno por defecto si DEFAULT_OPERATOR no está configurado', async () => {
    vi.unstubAllEnvs();
    vi.mocked(getFirestore).mockReturnValue(
      buildFirestoreMock(mockCaseData) as unknown as ReturnType<typeof getFirestore>
    );

    await generarPoderLegal('token-valido', 'caso-real-id');

    expect(generateMandatePDF).toHaveBeenCalledWith(
      expect.objectContaining({
        operatorName: 'Operador Desmulta',
        operatorId: '000000000',
      })
    );
  });

  it('debe usar el shortId generado desde el caseId si el caso no tiene shortId en Firestore', async () => {
    const dataSinShortId = { ...mockCaseData, shortId: undefined };
    vi.mocked(getFirestore).mockReturnValue(
      buildFirestoreMock(dataSinShortId as unknown as typeof mockCaseData) as unknown as ReturnType<
        typeof getFirestore
      >
    );

    await generarPoderLegal('token-valido', 'abcdefgh1234');

    expect(generateMandatePDF).toHaveBeenCalledWith(
      expect.objectContaining({
        shortId: 'ABCDEFGH', // primeros 8 chars en mayúsculas
      })
    );
  });

  it('debe transferir el tipo de documento al motor PDF', async () => {
    vi.mocked(getFirestore).mockReturnValue(
      buildFirestoreMock(mockCaseData) as unknown as ReturnType<typeof getFirestore>
    );

    const docType = 'nulidad_notificacion';

    await generarPoderLegal('token-valido', 'caso-real-id', undefined, docType);

    expect(generateMandatePDF).toHaveBeenCalledWith(
      expect.objectContaining({
        documentType: 'nulidad_notificacion',
      })
    );
  });

  it('debe retornar error si requireAdminSession lanza una excepción', async () => {
    const { requireAdminSession } = await import('@/lib/auth/require-admin-session');
    vi.mocked(requireAdminSession).mockRejectedValueOnce(new Error('Sesión inválida o expirada.'));

    const result = await generarPoderLegal('token-invalido', 'cualquier-id');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Sesión inválida o expirada.');
    }
  });
});
