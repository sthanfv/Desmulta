// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks de Firebase Admin ──────────────────────────────────────────────────
const mockSet = vi.fn().mockResolvedValue({} as unknown);
const mockDoc = vi.fn(() => ({ set: mockSet }));

const mockDocsEmpty = { empty: true, docs: [] };
const mockDocsPending = { empty: false, docs: [{ data: () => ({ status: 'pendiente' }) }] };
const mockDocsVerified = { empty: false, docs: [{ data: () => ({ status: 'en_proceso' }) }] };

// mockGet se usará secuencialmente para cada llamada .get() en el flujo
const mockGet = vi.fn();

const mockWhere = vi.fn(() => ({ where: mockWhere, get: mockGet }));

const mockCollection = vi.fn((path: string) => {
  if (path === 'consultations' || path === 'referidos') {
    return { where: mockWhere, doc: mockDoc };
  }
  return { doc: mockDoc };
});

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({ collection: mockCollection })),
  Timestamp: { now: vi.fn(() => 'timestamp_mock_value') },
}));

vi.mock('@/lib/firebase-admin', () => ({ getAdminApp: vi.fn() }));

vi.mock('@/lib/security/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true, reset: 0, isError: false }),
}));

vi.mock('@/lib/logger/security-logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({ get: vi.fn().mockReturnValue('127.0.0.1') }),
}));

import { registerReferral } from '@/app/referidos/actions';

describe('🛡️ Seguridad de Referidos VIP — Accesos y Validaciones', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🤖 Debe interceptar bots de forma silenciosa si el campo Honeypot está lleno', async () => {
    const result = await registerReferral('3001234567', '3117654321', 'bot@spammail.com');
    expect(result.success).toBe(true);
    expect(mockCollection).not.toHaveBeenCalled();
  });

  it('❌ Debe rechazar registros si los números de teléfono son inválidos (Schema Zod)', async () => {
    const result = await registerReferral('300', '3117654321', '');
    expect(result.success).toBe(false);
    expect(result.error).toContain('El número debe tener al menos 10 dígitos');
    expect(mockCollection).not.toHaveBeenCalled();
  });

  it('❌ Debe rechazar registros si el usuario intenta auto-referirse', async () => {
    const result = await registerReferral('3001234567', '3001234567', '');
    expect(result.success).toBe(false);
    expect(result.error).toContain('No puedes referirte a ti mismo');
  });

  it('❌ Debe bloquear el acceso VIP si el referidor no tiene consultas registradas', async () => {
    // 1ª llamada: consultas del referidor → vacío
    mockGet.mockResolvedValueOnce(mockDocsEmpty);

    const result = await registerReferral('3001234567', '3117654321', '');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Tu número no está registrado');
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('❌ Debe bloquear el acceso VIP si la consulta del referidor sigue pendiente', async () => {
    // 1ª llamada: consultas del referidor → solo pendiente
    mockGet.mockResolvedValueOnce(mockDocsPending);

    const result = await registerReferral('3001234567', '3117654321', '');
    expect(result.success).toBe(false);
    expect(result.error).toContain('aún está pendiente');
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('❌ [NUEVO] Debe bloquear si el referido ya es cliente activo de Desmulta', async () => {
    // 1ª llamada: consultas del referidor → verificado
    mockGet.mockResolvedValueOnce(mockDocsVerified);
    // 2ª llamada: consultas del referido → ya es cliente activo
    mockGet.mockResolvedValueOnce(mockDocsVerified);

    const result = await registerReferral('3001234567', '3117654321', '');
    expect(result.success).toBe(false);
    expect(result.error).toContain('ya tiene una consulta activa');
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('❌ [NUEVO] Debe bloquear referidos duplicados (mismo par ya registrado)', async () => {
    // 1ª llamada: consultas del referidor → verificado
    mockGet.mockResolvedValueOnce(mockDocsVerified);
    // 2ª llamada: consultas del referido → no es cliente aún
    mockGet.mockResolvedValueOnce(mockDocsEmpty);
    // 3ª llamada: buscar duplicado en 'referidos' → ya existe
    mockGet.mockResolvedValueOnce(mockDocsVerified); // non-empty = duplicado

    const result = await registerReferral('3001234567', '3117654321', '');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Ya registraste una referencia');
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('✅ Debe permitir el referido si el referidor es VIP verificado y el par es único', async () => {
    // 1ª llamada: consultas del referidor → verificado
    mockGet.mockResolvedValueOnce(mockDocsVerified);
    // 2ª llamada: consultas del referido → no es cliente
    mockGet.mockResolvedValueOnce(mockDocsEmpty);
    // 3ª llamada: duplicados → no hay
    mockGet.mockResolvedValueOnce(mockDocsEmpty);

    const result = await registerReferral('3001234567', '3117654321', '');
    expect(result.success).toBe(true);
    expect(mockCollection).toHaveBeenCalledWith('referidos');
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        tuNumero: '3001234567',
        suNumero: '3117654321',
        status: 'pendiente',
        source: 'web_vip',
      })
    );
  });
});
