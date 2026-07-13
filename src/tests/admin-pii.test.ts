import { describe, it, expect, vi } from 'vitest';
import { getCases } from '../app/admin/actions';

// Mock de Firestore
const mockGet = vi.fn();
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: vi.fn(() => ({
      where: vi.fn(() => ({
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => ({
            get: mockGet,
          })),
        })),
      })),
    })),
  })),
}));

// Mock Firebase Admin
vi.mock('@/lib/firebase-admin', () => ({
  getAdminApp: vi.fn(),
}));

// Mock session/auth
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(() => ({ value: 'valid-token' })),
  })),
}));

vi.mock('@/lib/auth/require-admin-session', () => ({
  requireAdminSession: vi.fn(async () => ({
    uid: 'admin123',
    email: 'admin@desmulta.com',
    role: 'superadmin',
  })),
}));

describe('Protección PII en Dashboard Admin (Hallazgo 2)', () => {
  it('getCases debe retornar datos enmascarados y NO exponer PII en claro', async () => {
    // Simulamos un documento de base de datos con PII real
    mockGet.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: 'case1',
          data: () => ({
            cedula: '1090123456', // PII real
            contacto: '3001234567', // PII real
            nombre: 'Juan Perez', // PII real
            cedulaHash: 'hash1',
            contactoHash: 'hash2',
            createdAt: { toDate: () => new Date() },
            updatedAt: { toDate: () => new Date() },
          }),
        },
      ],
    });

    const result = await getCases(1);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);

    const caseData = result.data[0];

    // Verificamos que la PII haya sido enmascarada (Zero-PII)
    expect(caseData.cedula).not.toBe('1090123456');
    expect(caseData.cedula).toContain('*');

    expect(caseData.contacto).not.toBe('3001234567');
    expect(caseData.contacto).toContain('*');

    expect(caseData.nombre).not.toBe('Juan Perez');
    expect(caseData.nombre).toContain('*');
  });
});
