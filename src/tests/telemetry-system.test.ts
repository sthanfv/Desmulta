// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logAdminAction, logRevealAuditAction } from '@/app/admin/audit-actions';
import { POST as webhookWompi } from '@/app/api/payments/webhook-wompi/route';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

// ──────────────────────────────────────────────────────────────────────────────
// MOCKS DE INFRAESTRUCTURA (Firestore, Sentry, Cookies, etc.)
// ──────────────────────────────────────────────────────────────────────────────
const mockAddLog = vi.fn();
const mockCreateCallback = vi.fn();
const mockUpdatePurchase = vi.fn();
const mockGetPurchase = vi.fn();

vi.mock('firebase-admin/firestore', () => {
  return {
    getFirestore: vi.fn(() => ({
      collection: vi.fn((collName) => ({
        add: (logEntry: any) => mockAddLog(collName, logEntry),
        doc: vi.fn((docId) => ({
          id: docId,
          create: (data: any) => mockCreateCallback(collName, docId, data),
          update: (data: any) => mockUpdatePurchase(collName, docId, data),
          get: () => mockGetPurchase(collName, docId),
        })),
      })),
    })),
    FieldValue: {
      serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP'),
    },
    Timestamp: {
      fromDate: vi.fn((date) => ({
        toMillis: () => date.getTime(),
        toDate: () => date,
      })),
    },
  };
});

vi.mock('@/lib/firebase-admin', () => ({
  getAdminApp: vi.fn(),
}));

vi.mock('@/lib/logger/security-logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    security: vi.fn(),
  },
}));

vi.mock('@/lib/payments/pdf-delivery', () => ({
  generarYEnviarPDF: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => {
    const map = new Map();
    map.set('x-forwarded-for', '192.168.1.100');
    return {
      get: (k: string) => map.get(k),
    };
  }),
  cookies: vi.fn(async () => ({
    get: vi.fn(() => ({ value: 'mock-session-token' })),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

vi.mock('next-firebase-auth-edge/lib/next/tokens', () => ({
  getTokens: vi.fn(async () => ({
    decodedToken: { email: 'admin_test@desmulta.online', uid: 'admin_uid_123' },
  })),
}));

// ──────────────────────────────────────────────────────────────────────────────
// TESTS DE SISTEMAS: MODO DIOS, TOUCH DEBUGGER Y REGISTRO DE VENTAS
// ──────────────────────────────────────────────────────────────────────────────
describe('📊 Sistema Integrado de Telemetría, Modo Dios y Ventas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // PRUEBA 1: TELEMETRÍA DE MODO DIOS (LOGS DE AUDITORÍA)
  // ============================================================================
  describe('👑 Modo Dios (Telemetría de Administración)', () => {
    it('Debe registrar de forma segura y persistir todas las acciones críticas en Firestore (audit_logs)', async () => {
      const payload = {
        adminEmail: 'supervisor@desmulta.online',
        action: 'UPDATE' as const,
        resource: 'expediente/EXP-999',
        details: { cambio: 'Cambio de estado a Radicado', causal: 'nulidad_notificacion' },
      };

      // Ejecutar el registro de auditoría
      const result = await logAdminAction(payload);

      // 1. Debe haber retornado éxito
      expect(result.success).toBe(true);

      // 2. Debe registrar la acción en la colección Firestore "audit_logs"
      expect(mockAddLog).toHaveBeenCalledTimes(1);
      const call = mockAddLog.mock.calls[0];
      expect(call[0]).toBe('audit_logs');
      expect(call[1]).toMatchObject({
        adminEmail: 'supervisor@desmulta.online',
        action: 'UPDATE',
        resource: 'expediente/EXP-999',
        details: payload.details,
        ipAddress: '192.168.1.100', // Capturada dinámicamente de ip-utils
      });
      expect(call[1]).toHaveProperty('timestamp');
      expect(call[1]).toHaveProperty('expireAt'); // Retención de 30 días activa
    });

    it('Debe auditar cuando un administrador revela la PII de un caso', async () => {
      // Registrar el revelado seguro de un expediente
      const result = await logRevealAuditAction('EXP-777');

      expect(result.success).toBe(true);
      expect(mockAddLog).toHaveBeenCalledTimes(1);

      const call = mockAddLog.mock.calls[0];
      expect(call[1]).toMatchObject({
        adminEmail: 'admin_test@desmulta.online', // Extraído del mock de sesión
        action: 'ACCESS',
        resource: 'expediente/EXP-777',
        details: {
          reason: 'Revelado de datos sensibles en UI (Zero-PII unmasking)',
        },
      });
    });
  });

  // ============================================================================
  // PRUEBA 2: REGISTRO E INTEGRIDAD DE VENTAS (WEBHOOK WOMPI)
  // ============================================================================
  describe('🛒 Registro de Ventas (Integridad en Base de Datos)', () => {
    const SECRET = 'wompi_events_secret_val_123';

    beforeEach(() => {
      process.env.WOMPI_EVENTS_SECRET = SECRET;
    });

    it('Debe registrar la venta, marcar la pre-orden como APPROVED y registrar la idempotencia en Firestore', async () => {
      const transactionId = 'txn_ventas_100';
      const reference = 'ref_compra_200';
      const timestamp = 1612345678;

      // Mock de base de datos para la orden de compra esperada (monto: 30000 COP)
      mockGetPurchase.mockImplementation((collName: string, docId: string) => {
        if (collName === 'purchases' && docId === reference) {
          return Promise.resolve({
            exists: true,
            data: () => ({
              amountCop: 3900000, // En producción PRODUCT_PRICES devuelve centavos
              productType: 'peticion_general',
              caseData: { shortId: 'EXP-101', infractorName: 'Pedro Pérez' },
            }),
          });
        }
        return Promise.resolve({ exists: false });
      });

      mockCreateCallback.mockResolvedValue(undefined);
      mockUpdatePurchase.mockResolvedValue(undefined);

      // Reconstruir la firma dinámica de Wompi
      const concatenatedValues =
        transactionId + 'APPROVED' + '3900000' + String(timestamp) + SECRET;
      const signatureChecksum = crypto
        .createHash('sha256')
        .update(concatenatedValues)
        .digest('hex');

      const payload = {
        event: 'transaction.updated',
        data: {
          transaction: {
            id: transactionId,
            reference: reference,
            status: 'APPROVED',
            amount_in_cents: 39000_00,
          },
        },
        timestamp,
        signature: {
          properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'],
          checksum: signatureChecksum,
        },
      };

      const req = new NextRequest('https://desmulta.online/api/payments/webhook-wompi', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const res = await webhookWompi(req);

      // 1. Debe haber respondido 200 OK a Wompi
      expect(res.status).toBe(200);

      // 2. Debe haber registrado la idempotencia del callback
      expect(mockCreateCallback).toHaveBeenCalledWith(
        'processed_callbacks',
        transactionId,
        expect.objectContaining({
          wompiTransactionId: transactionId,
          result: 'APPROVED',
        })
      );

      // 3. Debe actualizar la base de datos de compras (purchases) registrando la venta aprobada
      expect(mockUpdatePurchase).toHaveBeenCalledWith(
        'purchases',
        reference,
        expect.objectContaining({
          status: 'APPROVED',
          wompiTransactionId: transactionId,
        })
      );
    });

    it('Debe rechazar la venta e inyectar status FLAGGED_AMOUNT_MISMATCH en base de datos si hay discrepancia de precios (intento de fraude)', async () => {
      const transactionId = 'txn_fraude_101';
      const reference = 'ref_fraude_202';
      const timestamp = 1612345678;

      // Compra registrada en BD con valor real de 50.000 COP
      mockGetPurchase.mockImplementation((collName: string, docId: string) => {
        if (collName === 'purchases' && docId === reference) {
          return Promise.resolve({
            exists: true,
            data: () => ({
              amountCop: 5900000, // 59.000 COP esperado
              productType: 'prescripcion_directa',
            }),
          });
        }
        return Promise.resolve({ exists: false });
      });

      // El atacante intentó alterar el payload para pagar solo 50 COP
      const concatenatedValues = transactionId + 'APPROVED' + '5000' + String(timestamp) + SECRET;
      const signatureChecksum = crypto
        .createHash('sha256')
        .update(concatenatedValues)
        .digest('hex');

      const payload = {
        event: 'transaction.updated',
        data: {
          transaction: {
            id: transactionId,
            reference: reference,
            status: 'APPROVED',
            amount_in_cents: 50_00, // Solo pagó 50 COP
          },
        },
        timestamp,
        signature: {
          properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'],
          checksum: signatureChecksum,
        },
      };

      const req = new NextRequest('https://desmulta.online/api/payments/webhook-wompi', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const res = await webhookWompi(req);

      expect(res.status).toBe(200);

      // Verificamos que la base de datos haya registrado el intento de fraude
      expect(mockUpdatePurchase).toHaveBeenCalledWith(
        'purchases',
        reference,
        expect.objectContaining({
          status: 'FLAGGED_AMOUNT_MISMATCH',
          wompiTransactionId: transactionId,
        })
      );
    });
  });
});
