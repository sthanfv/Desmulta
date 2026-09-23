// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyGodMode } from '../audit-actions';

// Mock del Rate Limiter para pruebas
vi.mock('@/lib/security/rate-limit', () => ({
  rateLimit: vi.fn(() =>
    Promise.resolve({
      success: true,
      blocked: false,
      remaining: 5,
      reset: 0,
      totalRequests: 0,
      isError: false,
    })
  ),
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

// Mock de las cookies de Next.js
const mockSetCookie = vi.fn();
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    set: mockSetCookie,
    get: vi.fn(),
    delete: vi.fn(),
  })),
  headers: vi.fn(async () => ({
    get: vi.fn(),
  })),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: vi.fn(() => ({
      doc: vi.fn((docId) => ({
        id: docId,
        get: vi.fn().mockImplementation(async () => ({
          exists: false,
          data: () => undefined,
        })),
        set: vi.fn(),
      })),
    })),
    runTransaction: vi.fn().mockImplementation(async (updateFunction) => {
      const t = {
        get: vi.fn().mockImplementation(async (docRef) => await docRef.get()),
        set: vi.fn().mockImplementation((docRef, data, options) => docRef.set(data, options)),
        update: vi.fn(),
      };
      return await updateFunction(t);
    }),
  })),
  FieldValue: {
    serverTimestamp: vi.fn(() => ({
      toMillis: () => Date.now(),
    })),
  },
  Timestamp: {
    now: vi.fn(() => ({
      toMillis: () => Date.now(),
      toDate: () => new Date(),
    })),
    fromDate: vi.fn((date) => ({
      toMillis: () => date.getTime(),
      toDate: () => date,
    })),
    fromMillis: vi.fn((ms) => ({
      toMillis: () => ms,
      toDate: () => new Date(ms),
    })),
  },
}));

vi.mock('@/lib/firebase-admin', () => ({
  getAdminApp: vi.fn(),
}));

// [2026-09-22] God Mode y PIN operacional exigen una sesión admin 2FA válida
const mockGetAdminFromCookies = vi.fn();
vi.mock('@/lib/auth/admin-cookie-session', () => ({
  getAdminFromCookies: (...args: unknown[]) => mockGetAdminFromCookies(...args),
}));

describe('God Mode Security System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPERADMIN_AUDIT_PASSWORD = '9316';
    process.env.GOD_MODE_JWT_SECRET = 'test_secret_key_with_at_least_32_chars!';
    mockGetAdminFromCookies.mockResolvedValue({ uid: 'admin-1', email: 'admin@desmulta.online' });
  });

  it('Debe rechazar God Mode sin sesión admin 2FA aunque la contraseña sea correcta', async () => {
    mockGetAdminFromCookies.mockResolvedValueOnce(null);
    const result = await verifyGodMode('9316');
    expect(result.success).toBe(false);
    expect(mockSetCookie).not.toHaveBeenCalled();
  });

  it('Debe rechazar el acceso con una contraseña incorrecta', async () => {
    const result = await verifyGodMode('1234');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Acceso denegado');
    expect(mockSetCookie).not.toHaveBeenCalled();
  });

  it('Debe permitir el acceso, firmar JWT y establecer cookie HttpOnly con clave correcta', async () => {
    const result = await verifyGodMode('9316');

    expect(result.success).toBe(true);
    expect(mockSetCookie).toHaveBeenCalledTimes(1);

    // Verificar que la cookie tenga la seguridad estricta exigida
    const cookieArgs = mockSetCookie.mock.calls[0];
    expect(cookieArgs[0]).toBe('admin-god-mode-token');
    expect(cookieArgs[2]).toMatchObject({
      httpOnly: true,
      maxAge: 1800, // 30 minutos
    });
  });
});

describe('Operator Security PIN & Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPERATOR_PIN = '123456';
    process.env.GOD_MODE_JWT_SECRET = 'test_secret_key_with_at_least_32_chars!';
    mockGetAdminFromCookies.mockResolvedValue({ uid: 'admin-1', email: 'admin@desmulta.online' });
  });

  it('verifyOperatorPin - Debe rechazar un PIN incorrecto en tiempo constante', async () => {
    const { verifyOperatorPin } = await import('../audit-actions');
    const result = await verifyOperatorPin('000000');
    expect(result.success).toBe(false);
    expect(result.error).toBe('PIN incorrecto');
  });

  it('verifyOperatorPin - Debe aceptar el PIN correcto', async () => {
    const { verifyOperatorPin } = await import('../audit-actions');
    const result = await verifyOperatorPin('123456');
    expect(result.success).toBe(true);
  });
});
