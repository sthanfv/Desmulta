// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyGodMode } from '../audit-actions';

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

describe('God Mode Security System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPERADMIN_AUDIT_PASSWORD = '9316';
    process.env.GOD_MODE_JWT_SECRET = 'test_secret_key';
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
