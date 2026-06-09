/**
 * Smoke Test — Sistema de Notificaciones Push
 *
 * Verifica el comportamiento del dispatcher ante todos los escenarios posibles:
 *   1. Sin token registrado (usuario sin permisos)
 *   2. Token inválido (FCM rechaza → limpieza automática)
 *   3. Error transitorio de red (FCM timeout)
 *   4. Envío exitoso
 *
 * Nota: Los mocks de firebase-admin/messaging y firebase-admin/firestore
 * permiten ejecutar estos tests sin credenciales reales ni emulador.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock de firebase-admin/messaging
const mockSend = vi.fn();
vi.mock('firebase-admin/messaging', () => ({
  getMessaging: () => ({ send: mockSend }),
}));

// Mock de firebase-admin/firestore
const mockGet = vi.fn();
const mockUpdate = vi.fn();
const mockDocRef = {
  get: mockGet,
  update: mockUpdate,
  collection: vi.fn().mockReturnThis(),
  doc: vi.fn().mockReturnThis(),
};
const mockCollection = vi.fn(() => ({
  doc: vi.fn(() => mockDocRef),
}));
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ collection: mockCollection }),
  FieldValue: {
    delete: () => '__delete__',
    serverTimestamp: () => '__serverTimestamp__',
    arrayUnion: (v: unknown) => ({ _arrayUnion: v }),
  },
}));

// Mock del logger y telegram para no interactuar con el exterior ni la consola de tests
vi.mock('@/lib/logger/security-logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/telegram', () => ({
  sendTelegramPushError: vi.fn().mockResolvedValue(true),
}));

import { dispatchPush, getFcmToken } from '@/lib/notifications/notification-dispatcher';

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

const EXPEDIENTE_ID = 'EXP-1-001';
const VALID_TOKEN = 'fakeValidFCMToken1234567890abcdefghij';
const VALID_PAYLOAD = {
  title: '🔄 Estado Actualizado',
  body: 'Tu expediente avanzó de estado.',
  url: 'https://desmulta.online/seguir/uuid-test',
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function mockFirestoreConToken(token: string) {
  // Simula que el documento en private/push contiene el token
  mockGet.mockResolvedValue({
    exists: true,
    data: () => ({ fcmToken: token }),
  });
}

function mockFirestoreSinToken() {
  // Simula que no hay documento ni campo fcmToken
  mockGet.mockResolvedValue({
    exists: false,
    data: () => undefined,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE
// ─────────────────────────────────────────────────────────────────────────────

describe('Smoke Test — notification-dispatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Por defecto, update no lanza
    mockUpdate.mockResolvedValue(undefined);
  });

  // ── Escenario 1: Sin token ──────────────────────────────────────────────
  describe('Escenario 1: Usuario sin token registrado', () => {
    it('retorna statusCode "no_token" sin lanzar error', async () => {
      mockFirestoreSinToken();

      const result = await dispatchPush(EXPEDIENTE_ID, VALID_PAYLOAD, 'consultations', true);

      expect(result.sent).toBe(false);
      expect(result.statusCode).toBe('no_token');
      expect(result.cleaned).toBe(false);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('getFcmToken retorna null cuando no hay token', async () => {
      mockFirestoreSinToken();
      const token = await getFcmToken(EXPEDIENTE_ID, 'consultations');
      expect(token).toBeNull();
    });
  });

  // ── Escenario 2: Token inválido (rechazado por FCM) ─────────────────────
  describe('Escenario 2: Token inválido — FCM rechaza y limpia', () => {
    it('retorna statusCode "token_invalid" y llama a update para limpiar Firestore', async () => {
      mockFirestoreConToken(VALID_TOKEN);
      mockSend.mockRejectedValue(
        Object.assign(new Error('messaging/registration-token-not-registered'), {
          errorInfo: { code: 'messaging/registration-token-not-registered' },
        })
      );

      const result = await dispatchPush(EXPEDIENTE_ID, VALID_PAYLOAD, 'consultations', true);

      expect(result.sent).toBe(false);
      expect(result.statusCode).toBe('token_invalid');
      expect(result.cleaned).toBe(true);
      // El update debe haberse llamado para borrar el token inválido
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('detecta también el error sin prefijo messaging/', async () => {
      mockFirestoreConToken(VALID_TOKEN);
      mockSend.mockRejectedValue(new Error('registration-token-not-registered'));

      const result = await dispatchPush(EXPEDIENTE_ID, VALID_PAYLOAD, 'consultations', true);

      expect(result.statusCode).toBe('token_invalid');
      expect(result.cleaned).toBe(true);
    });
  });

  // ── Escenario 3: Error transitorio de red ───────────────────────────────
  describe('Escenario 3: Error transitorio de red o cuota FCM', () => {
    it('retorna statusCode "error" sin limpiar el token', async () => {
      mockFirestoreConToken(VALID_TOKEN);
      mockSend.mockRejectedValue(new Error('network-request-failed'));

      const result = await dispatchPush(EXPEDIENTE_ID, VALID_PAYLOAD, 'consultations', true);

      expect(result.sent).toBe(false);
      expect(result.statusCode).toBe('error');
      expect(result.cleaned).toBe(false);
      // El token NO debe borrarse — es un error transitorio
      expect(result.reason).toContain('ERROR_TRANSITORIO');
    });
  });

  // ── Escenario 4: Envío exitoso ──────────────────────────────────────────
  describe('Escenario 4: Envío exitoso', () => {
    it('retorna statusCode "sent" con el messageId de FCM', async () => {
      mockFirestoreConToken(VALID_TOKEN);
      mockSend.mockResolvedValue('projects/desmulta/messages/msg-abc-123');

      const result = await dispatchPush(EXPEDIENTE_ID, VALID_PAYLOAD, 'consultations', true);

      expect(result.sent).toBe(true);
      expect(result.statusCode).toBe('sent');
      expect(result.messageId).toBe('projects/desmulta/messages/msg-abc-123');
      expect(result.cleaned).toBe(false);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('el mensaje FCM incluye configuración para Web, Android e iOS', async () => {
      mockFirestoreConToken(VALID_TOKEN);
      mockSend.mockResolvedValue('msg-ok');

      await dispatchPush(EXPEDIENTE_ID, VALID_PAYLOAD, 'consultations', true);

      const callArg = mockSend.mock.calls[0][0];

      // Web Push
      expect(callArg.webpush).toBeDefined();
      expect(callArg.webpush.fcmOptions.link).toBe(VALID_PAYLOAD.url);
      expect(callArg.webpush.notification.icon).toContain('icon.png');
      expect(callArg.webpush.headers.Urgency).toBe('high');
      expect(callArg.webpush.headers.TTL).toBe('86400');

      // Android
      expect(callArg.android).toBeDefined();
      expect(callArg.android.priority).toBe('high');
      expect(callArg.android.ttl).toBe(86400000);

      // APNs (iOS/Safari)
      expect(callArg.apns).toBeDefined();
      expect(callArg.apns.headers['apns-priority']).toBe('10');
      expect(callArg.apns.payload.aps.sound).toBe('default');
    });
  });

  // ── Escenario 5: Fallback campo raíz ───────────────────────────────────
  describe('Escenario 5: Fallback al campo raíz cuando subcolección está vacía', () => {
    it('usa el token del campo raíz si private/push no tiene token', async () => {
      // Primera llamada (private/push): sin token
      mockGet
        .mockResolvedValueOnce({ exists: false, data: () => undefined }) // private/push
        .mockResolvedValueOnce({ exists: true, data: () => ({ fcmToken: VALID_TOKEN }) }); // raíz

      const token = await getFcmToken(EXPEDIENTE_ID, 'consultations');
      expect(token).toBe(VALID_TOKEN);
    });
  });

  // ── Escenario 6: colección "cases" (desde el admin) ─────────────────────
  describe('Escenario 6: Despacho desde colección "cases" (admin)', () => {
    it('usa la colección correcta al despachar desde cases', async () => {
      mockFirestoreConToken(VALID_TOKEN);
      mockSend.mockResolvedValue('msg-ok-cases');

      const result = await dispatchPush('CASE-001', VALID_PAYLOAD, 'cases', true);

      expect(result.sent).toBe(true);
      // Verificar que se usó la colección 'cases'
      expect(mockCollection).toHaveBeenCalledWith('cases');
    });
  });
});
