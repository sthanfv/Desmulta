import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks de firebase-admin antes de importar el módulo bajo prueba
vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => ({
    verifyIdToken: vi.fn(),
  })),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(),
      })),
    })),
  })),
}));

vi.mock('@/lib/firebase-admin', () => ({
  getAdminApp: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: vi.fn((key) => {
      if (key === 'origin') return 'https://desmulta.online';
      return null;
    }),
  })),
}));

import { requireAdminSession } from '@/lib/auth/require-admin-session';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

describe('requireAdminSession — Guardián de Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe lanzar error inmediatamente si no se pasa idToken', async () => {
    await expect(requireAdminSession('')).rejects.toThrow('Acceso denegado.');
  });

  it('debe lanzar error si el token JWT es inválido según Firebase Auth', async () => {
    vi.mocked(getAuth).mockReturnValue({
      verifyIdToken: vi.fn().mockRejectedValue(new Error('Token inválido')),
    } as unknown as ReturnType<typeof getAuth>);

    await expect(requireAdminSession('token-falso-malicioso')).rejects.toThrow(
      'Sesión inválida o expirada. Por favor inicia sesión nuevamente.'
    );
  });

  it('debe lanzar error si el UID verificado no existe en la colección admins', async () => {
    const mockDecodedToken = {
      uid: 'uid-no-admin',
      exp: Math.floor(Date.now() / 1000) + 3600,
      aud: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    };

    vi.mocked(getAuth).mockReturnValue({
      verifyIdToken: vi.fn().mockResolvedValue(mockDecodedToken),
    } as unknown as ReturnType<typeof getAuth>);

    vi.mocked(getFirestore).mockReturnValue({
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          get: vi.fn().mockResolvedValue({ exists: false }),
        })),
      })),
    } as unknown as ReturnType<typeof getFirestore>);

    await expect(requireAdminSession('token-usuario-sin-rol')).rejects.toThrow('Acceso denegado.');
  });

  it('debe retornar el decodedToken si el JWT es válido y el UID está en admins', async () => {
    const mockDecodedToken = {
      uid: 'uid-admin-real',
      email: 'admin@desmulta.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
      aud: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    };

    vi.mocked(getAuth).mockReturnValue({
      verifyIdToken: vi.fn().mockResolvedValue(mockDecodedToken),
    } as unknown as ReturnType<typeof getAuth>);

    vi.mocked(getFirestore).mockReturnValue({
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          get: vi.fn().mockResolvedValue({
            exists: true,
            data: () => ({ disabled: false }),
          }),
        })),
      })),
    } as unknown as ReturnType<typeof getFirestore>);

    const result = await requireAdminSession('token-admin-valido');

    expect(result).toEqual(mockDecodedToken);
    expect(result.uid).toBe('uid-admin-real');
  });
});
