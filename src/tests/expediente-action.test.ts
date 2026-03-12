import { describe, it, expect, vi } from 'vitest';
import { consolidarExpedienteEnDB } from '../app/actions/expediente.actions';

// Mock de Firebase Admin y Logger para evitar efectos secundarios
vi.mock('@/lib/firebase-admin', () => ({
  getAdminApp: vi.fn(),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(() => ({
          get: vi.fn().mockResolvedValue({
            empty: true,
            docs: [],
          }),
        })),
      })),
      add: vi.fn().mockResolvedValue({ id: 'doc_nuevo_123' }),
    })),
  })),
  FieldValue: {
    serverTimestamp: vi.fn(),
    increment: vi.fn(),
    arrayUnion: vi.fn(),
  },
}));

vi.mock('@/lib/logger/security-logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('🏦 Server Action - Consolidación de Expediente', () => {
  it('Debe procesar la ejecución de consolidación sin errores estructurales', async () => {
    const payload = {
      cedula: '1090123456',
      telefono: '3001234567',
      nuevasMultas: [{ comparendo: 'ABC', fecha: '2022', valor: 100000, estado: 'Cobro' }],
    };

    const respuesta = await consolidarExpedienteEnDB(payload);

    expect(respuesta.success).toBe(true);
    expect(respuesta.message).toContain('creado');
  });
});
