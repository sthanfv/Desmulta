import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockSet = vi.fn();
vi.mock('@upstash/redis', () => ({
  Redis: { fromEnv: vi.fn(() => ({ set: mockSet })) },
}));

vi.mock('@/lib/logger/security-logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('alertServiceFailure — alertas de caída de chat/OCR', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.TELEGRAM_BOT_TOKEN = 'bot-token';
    process.env.TELEGRAM_DEV_CHAT_ID = '-100123';
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.test';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'redis-token';
    mockFetch.mockResolvedValue({ ok: true });
    mockSet.mockResolvedValue('OK');
  });

  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it('envía HTML escapado (un error con < > & ` _ no rompe el mensaje)', async () => {
    const { alertServiceFailure } = await import('@/lib/monitoring/service-alert');
    const sent = await alertServiceFailure('ocr', 'fallo <script>&`raro_`', { traceId: 't-1' });

    expect(sent).toBe(true);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.parse_mode).toBe('HTML');
    expect(body.chat_id).toBe('-100123');
    expect(body.text).toContain('fallo &lt;script&gt;&amp;`raro_`');
    expect(body.text).not.toContain('<script>');
  });

  it('anti-spam: si ya hubo alerta del mismo servicio en la ventana, no reenvía', async () => {
    mockSet.mockResolvedValueOnce('OK').mockResolvedValueOnce(null);
    const { alertServiceFailure } = await import('@/lib/monitoring/service-alert');

    expect(await alertServiceFailure('chat', 'caído')).toBe(true);
    expect(await alertServiceFailure('chat', 'caído otra vez')).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith('alert:service:chat', expect.any(Number), {
      nx: true,
      ex: 600,
    });
  });

  it('si Redis falla, envía igual (mejor duplicada que perdida)', async () => {
    mockSet.mockRejectedValueOnce(new Error('redis down'));
    const { alertServiceFailure } = await import('@/lib/monitoring/service-alert');
    expect(await alertServiceFailure('ocr-worker', 'x')).toBe(true);
  });

  it('sin credenciales de Telegram no intenta enviar', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    const { alertServiceFailure } = await import('@/lib/monitoring/service-alert');
    expect(await alertServiceFailure('chat', 'x')).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('si Telegram falla no lanza excepción', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network'));
    const { alertServiceFailure } = await import('@/lib/monitoring/service-alert');
    await expect(alertServiceFailure('chat', 'x')).resolves.toBe(false);
  });
});
