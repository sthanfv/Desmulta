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
});
