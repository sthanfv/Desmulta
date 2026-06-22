import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { updateCaseStatus } from '@/app/admin/actions';
import { resend } from '@/lib/resend';
import { getFirestore } from 'firebase-admin/firestore';

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/lib/auth/require-admin-session', () => ({
  requireAdminSession: vi.fn().mockResolvedValue({ uid: 'admin-123' }),
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
  unstable_cache: vi.fn((fn) => fn),
}));

vi.mock('@/lib/firebase-admin', () => ({
  getAdminApp: vi.fn(),
}));

vi.mock('firebase-admin/firestore', () => {
  const mockDoc = {
    get: vi.fn(),
    update: vi.fn().mockResolvedValue(undefined),
  };
  const mockCollection = {
    doc: vi.fn((id) => ({ ...mockDoc, id })),
  };
  const mockDb = {
    collection: vi.fn(() => mockCollection),
    runTransaction: vi.fn(async (callback) => {
      const mockTransaction = {
        get: vi
          .fn()
          .mockResolvedValueOnce({
            exists: true,
            data: () => ({ consultationId: 'consultation-123' }),
          })
          .mockResolvedValueOnce({
            exists: true,
            data: () => ({
              email: 'cliente@test.com',
              nombre: 'Juan Perez',
              fcmToken: 'fcm-token-123',
            }),
          }),
        update: vi.fn(),
      };
      return callback(mockTransaction);
    }),
  };
  return {
    getFirestore: vi.fn(() => mockDb),
    Timestamp: { now: vi.fn(() => 'TIMESTAMP') },
    FieldValue: {
      serverTimestamp: vi.fn(() => 'TIMESTAMP'),
      arrayUnion: vi.fn((val) => [val]),
    },
  };
});

vi.mock('@/lib/resend', () => ({
  resend: {
    emails: {
      send: vi.fn().mockResolvedValue({ id: 'email-id-123' }),
    },
  },
}));

vi.mock('@/lib/notifications/notification-dispatcher', () => ({
  dispatchPush: vi.fn().mockResolvedValue({ success: true }),
  STATUS_TEMPLATES: {
    contactado: vi.fn(() => ({ title: 'Mock Title', body: 'Mock Body' })),
  },
}));

describe('updateCaseStatus — Notificaciones Delegadas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('NO debe enviar un correo electrónico directamente al cambiar de estado (Responsabilidad de Cloud Functions)', async () => {
    const mockDb = getFirestore();

    // Ejecutar la función
    await updateCaseStatus('fake-token', 'case-123', 'CONTACTADO', 'Prueba de estado');

    // Verificar que Resend NUNCA es llamado desde el servidor web
    expect(resend.emails.send).not.toHaveBeenCalled();
  });

  it('NO debe despachar la notificación push directamente al cambiar de estado (Responsabilidad de Cloud Functions)', async () => {
    const { dispatchPush } = await import('@/lib/notifications/notification-dispatcher');

    // Ejecutar la función
    await updateCaseStatus('fake-token', 'case-123', 'CONTACTADO', 'Prueba de estado');

    // Verificar que NO se invoca push directo
    expect(dispatchPush).not.toHaveBeenCalled();
  });
});
