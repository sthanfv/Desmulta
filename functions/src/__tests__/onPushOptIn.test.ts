import { describe, it, expect, vi, beforeEach } from 'vitest';
import test from 'firebase-functions-test';

// 1. Configurar Mocks
const mocks = vi.hoisted(() => {
  return {
    mockFetch: vi.fn(),
  };
});

// Mock Global Fetch
global.fetch = mocks.mockFetch;

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

vi.mock('firebase-admin', () => {
  return {
    firestore: () => ({
      collection: () => ({
        doc: () => ({
          get: vi.fn().mockResolvedValue({
            data: () => ({ nombre: 'Test', shortId: 'REF1' })
          })
        })
      })
    })
  };
});

import { onPushOptIn } from '../onPushOptIn';

const testEnv = test();

describe('onPushOptIn - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TELEGRAM_BOT_TOKEN = 'bot_test';
    process.env.TELEGRAM_CHAT_ID = 'chat_test';

    mocks.mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('OK'),
    });
  });

  it('debe enviar mensaje a Telegram si se añade fcmToken', async () => {
    const wrapped = testEnv.wrap(onPushOptIn as any);
    
    const beforeSnap = testEnv.firestore.makeDocumentSnapshot({ fcmToken: null }, 'consultations/1');
    const afterSnap = testEnv.firestore.makeDocumentSnapshot({ fcmToken: 'token_abc', nombre: 'Test', shortId: 'REF1' }, 'consultations/1');
    
    const change = testEnv.makeChange(beforeSnap, afterSnap);
    
    await wrapped({ data: change, params: { consultationId: '1' } });
    
    expect(mocks.mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('api.telegram.org/botbot_test/sendMessage'),
      expect.anything()
    );
  });

  it('NO debe enviar mensaje si fcmToken no cambia', async () => {
    const wrapped = testEnv.wrap(onPushOptIn as any);
    
    const beforeSnap = testEnv.firestore.makeDocumentSnapshot({ fcmToken: 'token_abc' }, 'consultations/1');
    const afterSnap = testEnv.firestore.makeDocumentSnapshot({ fcmToken: 'token_abc' }, 'consultations/1');
    
    const change = testEnv.makeChange(beforeSnap, afterSnap);
    
    await wrapped({ data: change, params: { consultationId: '1' } });
    
    expect(mocks.mockFetch).not.toHaveBeenCalled();
  });
});
