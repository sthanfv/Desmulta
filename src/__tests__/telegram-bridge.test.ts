import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dispatchToTelegram } from '@/actions/telegram-bridge';

// Inyección de dependencias (Mocks)
vi.mock('@/lib/legal/pdf-engine', () => ({
  generateMandatePDF: vi.fn().mockResolvedValue(new Uint8Array([37, 80, 68, 70, 45])), // Binario falso '%PDF-'
}));

vi.mock('@/lib/firebase-admin', () => ({
  getAdminApp: vi.fn(),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue({ exists: true, data: () => ({ status: 'VERIFIED' }) }),
      })),
    })),
  })),
}));

describe('Telegram Bridge Action (Network Mock)', () => {
  beforeEach(() => {
    // Aprovisionamiento de entorno seguro
    vi.stubEnv('TELEGRAM_BOT_TOKEN', 'mock-token-123');
    vi.stubEnv('TELEGRAM_CHAT_ID', 'mock-chat-id');
    vi.stubEnv('DEFAULT_OPERATOR_NAME', 'Dev Ops');
    vi.stubEnv('DEFAULT_OPERATOR_ID', '00000000');

    // Intercepción de Fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, description: 'Mock delivered' }),
    } as Response);
  });

  it('should assemble FormData and return 200 on successful API dispatch', async () => {
    const mockData = {
      fullName: 'Test User',
      documentId: '12345678901', // 11 dígitos — dentro del rango \d{5,12}
      ticketNumber: 'T-999',
      licensePlate: 'AAA111', // Formato colombiano: 3 letras + 2 dígitos + 1 dígito/letra
      shortId: 'TX-TEST-001',
      acceptedAt: new Date().toISOString(),
    };

    const mockAuth = { method: 'WA_INVERTED', proof: 'PENDING_MANUAL_REVIEW' };

    const response = await dispatchToTelegram(mockData, mockAuth);

    // Validación de respuesta interna
    expect(response.status).toBe(200);
    expect(response.message).toBe('PAYLOAD_DELIVERED');

    // Validación de telemetría de red
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const fetchArgs = vi.mocked(global.fetch).mock.calls[0];
    const targetUrl = fetchArgs[0] as string;
    const requestInit = fetchArgs[1];

    expect(targetUrl).toBe('https://api.telegram.org/botmock-token-123/sendDocument');
    expect(requestInit?.method).toBe('POST');
    expect(requestInit?.body).toBeInstanceOf(FormData);
  });
});
