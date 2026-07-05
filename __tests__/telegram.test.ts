import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendTelegramNotification } from '../src/lib/telegram';

// Mock process.env
const originalEnv = process.env;

// Mock Firebase Admin
vi.mock('@/lib/firebase-admin', () => ({
  getAdminApp: vi.fn(),
}));

const { mockGet, mockUpdate } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockUpdate: vi.fn().mockResolvedValue(true),
}));

vi.mock('firebase-admin/firestore', () => {
  return {
    getFirestore: vi.fn(() => ({
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          get: mockGet,
          update: mockUpdate,
        })),
      })),
    })),
    Timestamp: {
      now: vi.fn(() => ({ toMillis: () => 1234567890 })),
    },
  };
});

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Telegram Module - Security & Zero-PII (Option C)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      TELEGRAM_BOT_TOKEN: 'mock-token',
      TELEGRAM_CHAT_ID: 'mock-chat-id',
      NEXT_PUBLIC_BASE_URL: 'https://test.desmulta.com',
    };
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
      headers: new Headers(),
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('no debería enviar PII (cédula en texto plano o cifrada) al bot de Telegram', async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({
        nombre: 'Juan Perez',
        cedula: 'ENC:f8c1ed82d1e76694c8ed8619:3e6212...',
        placa: 'XYZ-123',
        contacto: '3001234567',
        shortId: 'EXP-TEST',
      }),
    });

    const result = await sendTelegramNotification('doc-12345');
    
    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalled();

    // Obtener el payload enviado a la API de Telegram
    const fetchArgs = mockFetch.mock.calls[0];
    const payload = JSON.parse(fetchArgs[1].body);

    // Verificar que el payload no contenga la cédula
    expect(payload.text).not.toContain('ENC:f8c1');
    expect(payload.text).toContain('🔒 [Protegida por E2EE]');
    
    // Verificar que se haya creado el botón mágico con el docId como parámetro
    const inlineKeyboard = payload.reply_markup.inline_keyboard;
    expect(inlineKeyboard).toBeDefined();
    
    // Botón de WhatsApp
    expect(inlineKeyboard[0][0].text).toContain('Responder por WhatsApp');
    
    // Botón Mágico
    expect(inlineKeyboard[1][0].text).toContain('Ver Datos Sensibles');
    expect(inlineKeyboard[1][0].url).toBe('https://test.desmulta.com/admin?search=doc-12345');
  });

  it('debería soportar envío de fotos (SIMIT) ocultando PII y enviando el botón', async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({
        nombre: 'Maria Lopez',
        cedula: '1234567890', // Aunque sea texto plano por error, no debe enviarse
        placa: 'ABC-987',
        contacto: '3001234567',
        evidenceUrl: 'https://storage.com/foto.jpg',
      }),
    });

    // Mock the fetch for the image download
    mockFetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    }));

    // Mock the fetch for the Telegram sendPhoto API
    mockFetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
      headers: new Headers(),
    }));

    const result = await sendTelegramNotification('doc-simit');
    
    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);

    const telegramArgs = mockFetch.mock.calls[1];
    expect(telegramArgs[0]).toContain('sendPhoto');
    
    // Con FormData, extraemos el caption y reply_markup
    const formData = telegramArgs[1].body as FormData;
    const caption = formData.get('caption') as string;
    const replyMarkup = JSON.parse(formData.get('reply_markup') as string);

    expect(caption).not.toContain('1234567890');
    expect(caption).toContain('🔒 [Protegida por E2EE]');
    
    expect(replyMarkup.inline_keyboard[1][0].url).toBe('https://test.desmulta.com/admin?search=doc-simit');
  });
});
