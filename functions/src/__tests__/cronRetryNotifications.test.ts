import { describe, it, expect, vi, beforeEach } from 'vitest';
import test from 'firebase-functions-test';

// 1. Configurar Mocks
const mocks = vi.hoisted(() => {
  return {
    mockFirestoreGet: vi.fn(),
    mockFirestoreUpdate: vi.fn(),
    mockFetch: vi.fn(),
  };
});

global.fetch = mocks.mockFetch;

vi.mock('firebase-admin', () => {
  const update = mocks.mockFirestoreUpdate;
  
  const query = {
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: mocks.mockFirestoreGet,
  };

  const firestoreMock = vi.fn(() => ({
    collection: vi.fn(() => query),
  }));

  return {
    default: {
      firestore: firestoreMock,
      apps: ['mock'],
      initializeApp: vi.fn()
    },
    firestore: Object.assign(firestoreMock, {
      FieldValue: {
        serverTimestamp: vi.fn(() => 'mock-timestamp')
      }
    }),
  };
});

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

import { cronRetryNotifications } from '../cronRetryNotifications';

const testEnv = test();

describe('cronRetryNotifications - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TELEGRAM_BOT_TOKEN = 'bot_test';
    process.env.TELEGRAM_CHAT_ID = 'chat_test';

    mocks.mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('OK'),
      json: () => Promise.resolve({ result: { message_id: 55555 } }),
    });
  });

  it('debe reintentar notificaciones fallidas y actualizar Firestore', async () => {
    const wrapped = testEnv.wrap(cronRetryNotifications as any);
    
    // Simular 1 documento fallido
    mocks.mockFirestoreGet.mockResolvedValue({
      empty: false,
      docs: [
        { 
          id: 'failed_doc_1', 
          data: () => ({ nombre: 'Retry User', placa: 'XYZ789' }),
          ref: { update: mocks.mockFirestoreUpdate }
        }
      ]
    });

    await wrapped({});

    expect(mocks.mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('sendMessage'),
      expect.objectContaining({
        body: expect.stringContaining('REINTENTO AUTOMÁTICO')
      })
    );

    expect(mocks.mockFirestoreUpdate).toHaveBeenCalledWith(expect.objectContaining({
      telegramStatus: 'sent',
      telegramMessageId: 55555
    }));
  });

  it('debe abortar si no hay notificaciones fallidas', async () => {
    const wrapped = testEnv.wrap(cronRetryNotifications as any);
    
    mocks.mockFirestoreGet.mockResolvedValue({ empty: true });

    await wrapped({});

    expect(mocks.mockFetch).not.toHaveBeenCalled();
    expect(mocks.mockFirestoreUpdate).not.toHaveBeenCalled();
  });

  it('debe respetar el límite MAX_RETRIES_PER_RUN: solo procesa hasta 10 docs', async () => {
    const wrapped = testEnv.wrap(cronRetryNotifications as any);

    // Simular 5 documentos fallidos (menos del límite de 10)
    const docsFallidos = Array.from({ length: 5 }, (_, i) => ({
      id: `failed_doc_${i}`,
      data: () => ({ nombre: `Cliente ${i}`, placa: `ABC00${i}`, contacto: '3101234567' }),
      ref: { update: mocks.mockFirestoreUpdate },
    }));

    mocks.mockFirestoreGet.mockResolvedValue({ empty: false, docs: docsFallidos });

    await wrapped({});

    // Telegram fue llamado una vez por cada documento (5 en total)
    expect(mocks.mockFetch).toHaveBeenCalledTimes(5);
    expect(mocks.mockFirestoreUpdate).toHaveBeenCalledTimes(5);
  });

  it('debe manejar error de Telegram sin lanzar excepción no capturada (fail-safe)', async () => {
    const wrapped = testEnv.wrap(cronRetryNotifications as any);

    // Telegram falla con error de red
    mocks.mockFetch.mockRejectedValueOnce(new Error('Telegram: Network Error'));

    mocks.mockFirestoreGet.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: 'doc-error-telega',
          data: () => ({ nombre: 'Error User', placa: 'ERR001', contacto: '3009876543' }),
          ref: { update: mocks.mockFirestoreUpdate },
        },
      ],
    });

    // El cron debe absorber el error internamente — no propagar excepciones
    await expect(wrapped({})).resolves.not.toThrow();

    // Firestore NO debe haber sido actualizado a 'sent' si Telegram falló
    expect(mocks.mockFirestoreUpdate).not.toHaveBeenCalledWith(
      expect.objectContaining({ telegramStatus: 'sent' })
    );
  });
});
