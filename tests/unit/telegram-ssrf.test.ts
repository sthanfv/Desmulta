import { expect, test, vi } from 'vitest';
import { sendTelegramNotification } from '@/lib/telegram';
import { validateWebhookUrl } from '@/lib/security/ssrf-guard';

vi.mock('@/lib/security/ssrf-guard', () => ({
  validateWebhookUrl: vi.fn().mockImplementation(async (url) => {
    if (url.includes('169.254.169.254')) throw new Error('SSRF Bloqueado');
    return;
  }),
}));

process.env.TELEGRAM_BOT_TOKEN = 'mock';
process.env.TELEGRAM_CHAT_ID = 'mock';

vi.mock('@/lib/firebase-admin', () => ({
  getAdminApp: vi.fn(),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(() => Promise.resolve({ exists: true, data: () => ({}) })),
        update: vi.fn(() => Promise.resolve()),
      })),
    })),
  })),
  Timestamp: { now: vi.fn() },
}));

test('A-3: SSRF protection en telegram.ts debe bloquear metadata IPs', async () => {
  const result = await sendTelegramNotification(
    'DOC-123',
    'http://169.254.169.254/latest/meta-data'
  );
  expect(validateWebhookUrl).toHaveBeenCalledWith('http://169.254.169.254/latest/meta-data');
  // Should return false because it throws an error in the try/catch
  expect(result).toBe(false);
});
