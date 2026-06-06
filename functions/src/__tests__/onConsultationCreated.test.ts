import { describe, it, expect, vi, beforeEach } from 'vitest';
import test from 'firebase-functions-test';

// 1. Configurar Mocks
const mocks = vi.hoisted(() => {
  return {
    mockEmailsSend: vi.fn(),
    mockFirestoreUpdate: vi.fn(),
    mockFetch: vi.fn(),
  };
});

vi.mock('firebase-admin', () => {
  const update = mocks.mockFirestoreUpdate;
  const doc = vi.fn(() => ({ update }));
  const collection = vi.fn(() => ({ doc }));
  const runTransaction = vi.fn(async (cb) => cb({
    get: vi.fn(async () => ({ data: () => ({ processingStatus: undefined }) })),
    update: mocks.mockFirestoreUpdate
  }));
  return {
    default: {
      firestore: vi.fn(() => ({ collection, runTransaction })),
      apps: ['mock'],
      initializeApp: vi.fn()
    },
    firestore: Object.assign(vi.fn(() => ({ collection, runTransaction })), {
      FieldValue: {
        serverTimestamp: vi.fn(() => 'mock-timestamp')
      }
    }),
  };
});

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(function () {
    return {
      emails: { send: mocks.mockEmailsSend },
    };
  }),
}));

vi.mock('firebase-functions', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  };
});

// Mock Global Fetch
global.fetch = mocks.mockFetch;

import { onConsultationCreated } from '../onConsultationCreated';

const testEnv = test();

describe('onConsultationCreated - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 're_test_123';
    process.env.TELEGRAM_BOT_TOKEN = 'bot_test';
    process.env.TELEGRAM_CHAT_ID = 'chat_test';
    process.env.INTERNAL_API_SECRET = 'secret_test';

    mocks.mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('OK'),
      json: () => Promise.resolve({ result: { message_id: 12345 } }),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    });
    mocks.mockEmailsSend.mockResolvedValue({ data: { id: 'email_id' }, error: null });
  });

  it('debe enviar email, notificar a Telegram y purgar el blob en una consulta web estándar', async () => {
    const wrapped = testEnv.wrap(onConsultationCreated as any);
    
    const data = {
      shortId: 'DES-101',
      emailContacto: 'cliente@example.com',
      placa: 'AAA111',
      nombre: 'Test User',
      contacto: '3000000000',
      evidenceUrl: 'https://public.blob.vercel-storage.com/evidencia.jpg',
      fuente: 'web',
      trackingUuid: 'track-123'
    };

    const snap = testEnv.firestore.makeDocumentSnapshot(data, 'consultations/id123');

    await wrapped({ data: snap, params: { id: 'id123' } });

    // Verificar Email
    expect(mocks.mockEmailsSend).toHaveBeenCalledWith(expect.objectContaining({
      to: 'cliente@example.com',
      subject: expect.stringContaining('DES-101')
    }));

    // Verificar Telegram (Debe haber llamado a descargar la imagen y luego a sendPhoto)
    expect(mocks.mockFetch).toHaveBeenCalledWith('https://public.blob.vercel-storage.com/evidencia.jpg');
    expect(mocks.mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('api.telegram.org/botbot_test/sendPhoto'),
      expect.anything()
    );

    // Verificar Purga de Blob
    expect(mocks.mockFetch).toHaveBeenCalledWith(
      'https://desmulta.online/api/internal/purge-blob',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-internal-secret': 'secret_test' })
      })
    );

    // Verificar Update en Firestore
    expect(mocks.mockFirestoreUpdate).toHaveBeenCalledWith(expect.objectContaining({
      telegramStatus: 'sent'
    }));
  });

  it('NO debe purgar el blob si la fuente es simit_capture (Preservación de Evidencia)', async () => {
    const wrapped = testEnv.wrap(onConsultationCreated as any);
    
    const data = {
      shortId: 'SIM-999',
      emailContacto: 'simit@test.com',
      evidenceUrl: 'https://public.blob.vercel-storage.com/simit.jpg',
      fuente: 'simit_capture'
    };

    const snap = testEnv.firestore.makeDocumentSnapshot(data, 'consultations/simit123');

    await wrapped({ data: snap, params: { id: 'simit123' } });

    // La purga NO debe haberse llamado para fuentes SIMIT
    const fetchCalls = mocks.mockFetch.mock.calls.map(call => call[0]);
    expect(fetchCalls).not.toContain('https://desmulta.online/api/internal/purge-blob');
  });
});
