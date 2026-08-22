import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendAdminOtp, verifyAdminOtp } from '@/app/admin/otp-actions';
import { sendOtpToAdmin, verifyOtpCode } from '@/lib/auth/otp-service';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { resend } from '@/lib/resend';
import { requireAdminSession } from '@/lib/auth/require-admin-session';
import { cookies } from 'next/headers';
import { createHash } from 'crypto';

// ── Mocks de firebase-admin ──────────────────────────────────────────────────
const mockSet = vi.fn().mockResolvedValue({});
const mockUpdate = vi.fn().mockResolvedValue({});
const mockDelete = vi.fn().mockResolvedValue({});
const mockGet = vi.fn();

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        set: mockSet,
        update: mockUpdate,
        delete: mockDelete,
        get: mockGet,
      })),
    })),
  })),
  Timestamp: {
    fromDate: vi.fn((date: Date) => ({
      toDate: () => date,
      toMillis: () => date.getTime(),
    })),
    now: vi.fn(() => ({
      toDate: () => new Date(),
      toMillis: () => Date.now(),
    })),
  },
}));

vi.mock('@/lib/firebase-admin', () => ({
  getAdminApp: vi.fn(),
}));

vi.mock('@/lib/auth/require-admin-session', () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock('@/lib/resend', () => ({
  resend: {
    emails: {
      send: vi.fn().mockResolvedValue({ id: 'mock-email-id' }),
    },
  },
}));

vi.mock('next/headers', () => {
  const mockCookieSet = vi.fn();
  return {
    cookies: vi.fn().mockResolvedValue({ set: mockCookieSet }),
  };
});

vi.mock('jose', () => ({
  SignJWT: vi.fn().mockImplementation(function (this: object) {
    return {
      setProtectedHeader: vi.fn().mockReturnThis(),
      setExpirationTime: vi.fn().mockReturnThis(),
      sign: vi.fn().mockResolvedValue('mocked-jwt-token'),
    };
  }),
}));

vi.mock('@/app/admin/audit-actions', () => ({
  logAdminAction: vi.fn().mockResolvedValue({}),
}));

// ── Utilidad para generar hash en tests ─────────────────────────────────────
function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 1: Servicio centralizado de OTP (otp-service.ts)
// ─────────────────────────────────────────────────────────────────────────────
describe('Servicio OTP Centralizado — otp-service.ts', () => {
  const mockUid = 'admin-test-uid';
  const mockEmail = 'admin@desmulta.online';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOD_MODE_JWT_SECRET = 'super-secret-key-of-32-chars-long';
  });

  it('✅ sendOtpToAdmin: debe guardar el hash en Firestore y enviar email', async () => {
    await sendOtpToAdmin(mockUid, mockEmail);

    const db = getFirestore();
    const mockDoc = db.collection('admin_otps').doc(mockUid);

    expect(mockDoc.set).toHaveBeenCalledWith(
      expect.objectContaining({
        codeHash: expect.any(String),
        createdAt: expect.any(Object),
        expiresAt: expect.any(Object),
        attempts: 0,
      })
    );

    expect(resend.emails.send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Desmulta Seguridad <seguridad@desmulta.online>',
        to: mockEmail,
        subject: expect.stringContaining('Acceso Administrativo'),
      })
    );
  });

  it('✅ verifyOtpCode: debe verificar un código correcto y eliminar el registro', async () => {
    const rawCode = '654321';
    const codeHash = hashCode(rawCode);
    const expiresAt = new Date(Date.now() + 60_000);

    const db = getFirestore();
    const mockDoc = db.collection('admin_otps').doc(mockUid);

    vi.mocked(mockGet).mockResolvedValue({
      exists: true,
      data: () => ({
        codeHash,
        createdAt: Timestamp.fromDate(new Date()),
        expiresAt: Timestamp.fromDate(expiresAt),
        attempts: 0,
      }),
    });

    const result = await verifyOtpCode(mockUid, rawCode);
    expect(result.success).toBe(true);
    expect(mockDoc.delete).toHaveBeenCalled();
  });

  it('🚫 verifyOtpCode: debe rechazar un código incorrecto e incrementar intentos', async () => {
    const rawCode = '123456';
    const codeHash = hashCode(rawCode);
    const expiresAt = new Date(Date.now() + 60_000);

    const db = getFirestore();
    const mockDoc = db.collection('admin_otps').doc(mockUid);

    vi.mocked(mockGet).mockResolvedValue({
      exists: true,
      data: () => ({
        codeHash,
        createdAt: Timestamp.fromDate(new Date()),
        expiresAt: Timestamp.fromDate(expiresAt),
        attempts: 0,
      }),
    });

    const result = await verifyOtpCode(mockUid, '999999');
    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toContain('incorrecto');
    expect(mockDoc.update).toHaveBeenCalledWith({ attempts: 1 });
  });

  it('🚫 verifyOtpCode: debe bloquear al superar el límite de 3 intentos', async () => {
    const rawCode = '123456';
    const codeHash = hashCode(rawCode);
    const expiresAt = new Date(Date.now() + 60_000);

    const db = getFirestore();
    const mockDoc = db.collection('admin_otps').doc(mockUid);

    vi.mocked(mockGet).mockResolvedValue({
      exists: true,
      data: () => ({
        codeHash,
        createdAt: Timestamp.fromDate(new Date()),
        expiresAt: Timestamp.fromDate(expiresAt),
        attempts: 3, // Ya en el límite
      }),
    });

    const result = await verifyOtpCode(mockUid, rawCode);
    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toContain('límite de intentos');
    expect(mockDoc.delete).toHaveBeenCalled();
  });

  it('🚫 verifyOtpCode: debe rechazar un código expirado y limpiar Firestore', async () => {
    const rawCode = '123456';
    const codeHash = hashCode(rawCode);
    const expiresAt = new Date(Date.now() - 10_000); // Expirado hace 10 segundos

    const db = getFirestore();
    const mockDoc = db.collection('admin_otps').doc(mockUid);

    vi.mocked(mockGet).mockResolvedValue({
      exists: true,
      data: () => ({
        codeHash,
        createdAt: Timestamp.fromDate(new Date()),
        expiresAt: Timestamp.fromDate(expiresAt),
        attempts: 0,
      }),
    });

    const result = await verifyOtpCode(mockUid, rawCode);
    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toContain('expirado');
    expect(mockDoc.delete).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 2: Server Actions (otp-actions.ts) — Compatibilidad con flujo clásico
// ─────────────────────────────────────────────────────────────────────────────
describe('2FA OTP — Server Actions (Flujo Clásico)', () => {
  const mockUid = 'admin-test-uid';
  const mockEmail = 'admin@desmulta.online';
  const mockToken = 'mock-id-token';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOD_MODE_JWT_SECRET = 'super-secret-key-of-32-chars-long';

    vi.mocked(requireAdminSession).mockResolvedValue({
      uid: mockUid,
      email: mockEmail,
      exp: Math.floor(Date.now() / 1000) + 3600,
    } as ReturnType<typeof requireAdminSession> extends Promise<infer T> ? T : never);
  });

  it('✅ sendAdminOtp: debe generar OTP, guardarlo en Firestore y enviarlo por email', async () => {
    const res = await sendAdminOtp(mockToken);
    expect(res.success).toBe(true);

    // El correo ahora usa plantilla HTML institucional (no texto plano) — mejora estética QA
    expect(resend.emails.send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Desmulta Seguridad <seguridad@desmulta.online>',
        to: mockEmail,
        subject: expect.stringContaining('Acceso Administrativo'),
        html: expect.stringContaining('Desmulta'), // Plantilla HTML institucional con marca Desmulta
      })
    );
  });

  it('✅ verifyAdminOtp: debe verificar código correcto y establecer cookie HttpOnly', async () => {
    const rawCode = '123456';
    const codeHash = hashCode(rawCode);
    const expiresAt = new Date(Date.now() + 60_000);

    const db = getFirestore();
    db.collection('admin_otps').doc(mockUid);

    vi.mocked(mockGet).mockResolvedValue({
      exists: true,
      data: () => ({
        codeHash,
        createdAt: Timestamp.fromDate(new Date()),
        expiresAt: Timestamp.fromDate(expiresAt),
        attempts: 0,
      }),
    });

    const res = await verifyAdminOtp(mockToken, rawCode);
    expect(res.success).toBe(true);

    const cookieStore = await cookies();
    expect(cookieStore.set).toHaveBeenCalledWith(
      'admin-2fa-token',
      expect.any(String),
      expect.objectContaining({ httpOnly: true, sameSite: 'strict', path: '/' })
    );
  });
});
