import { POST } from '@/app/api/webhooks/sentry/route';
import { NextRequest } from 'next/server';
import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest';

// Mock del logger para que no ensucie la consola durante los tests
vi.mock('@/lib/logger/security-logger', () => ({
  logger: {
    error: vi.fn(),
    security: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock del fetch global para simular la API de Telegram
global.fetch = vi.fn();

describe('Sentry Webhook API Route', () => {
  const originalEnv = process.env;
  const VALID_SECRET = 'super-secret-key';

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.SENTRY_WEBHOOK_SECRET = VALID_SECRET;
    process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
    process.env.TELEGRAM_CHAT_ID = 'test-chat-id';
    process.env.TELEGRAM_DEV_CHAT_ID = 'security-chat-id';
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as any);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it('debe rechazar la petición si no se envía un secret en el header', async () => {
    // N-03 (Fix auditoría): El secreto ahora va en el header x-sentry-hook-secret, NO en la URL
    const req = new NextRequest('http://localhost/api/webhooks/sentry', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('No autorizado');
  });

  it('debe rechazar la petición si el secret del header es incorrecto', async () => {
    // N-03: Secret enviado por header con valor incorrecto
    const req = new NextRequest('http://localhost/api/webhooks/sentry', {
      method: 'POST',
      headers: { 'x-sentry-hook-secret': 'wrong-secret' },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('debe fallar con error 500 si la variable de entorno SENTRY_WEBHOOK_SECRET no está configurada', async () => {
    delete process.env.SENTRY_WEBHOOK_SECRET;

    // N-03: Incluso con header válido, si el servidor no tiene la var configurada → 500
    const req = new NextRequest('http://localhost/api/webhooks/sentry', {
      method: 'POST',
      headers: { 'x-sentry-hook-secret': VALID_SECRET },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Configuración ausente en el servidor');
  });

  it('debe fallar con error 500 si falta el token de Telegram', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;

    // N-03: Secret correcto en header, pero Telegram no configurado
    const req = new NextRequest('http://localhost/api/webhooks/sentry', {
      method: 'POST',
      headers: { 'x-sentry-hook-secret': VALID_SECRET },
      body: JSON.stringify({ level: 'error', project: 'test' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Telegram no configurado');
  });

  it('debe enviar la notificación a Telegram exitosamente con credenciales correctas', async () => {
    const sentryPayload = {
      project_name: 'Desmulta',
      level: 'error',
      event: {
        title: 'CircuitBreaker tripped',
        culprit: 'src/lib/circuit.ts',
        web_url: 'https://sentry.io/desmulta/123'
      }
    };

    // N-03: Secret enviado de forma segura por header HTTP, nunca en la URL
    const req = new NextRequest('http://localhost/api/webhooks/sentry', {
      method: 'POST',
      headers: { 'x-sentry-hook-secret': VALID_SECRET },
      body: JSON.stringify(sentryPayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    // Esperar a que las promesas dinámicas (waitUntil) se resuelvan en el event loop
    await new Promise(resolve => setTimeout(resolve, 50));

    // Verificar que el fetch a Telegram se haya llamado con los parámetros esperados
    expect(fetch).toHaveBeenCalledTimes(1);
    const fetchArgs = vi.mocked(fetch).mock.calls[0];
    expect(fetchArgs[0]).toBe('https://api.telegram.org/bottest-bot-token/sendMessage');
    const fetchConfig = fetchArgs[1] as RequestInit;
    expect(fetchConfig.method).toBe('POST');
    
    const bodySent = JSON.parse(fetchConfig.body as string);
    expect(bodySent.chat_id).toBe('security-chat-id');
    expect(bodySent.text).toContain('Desmulta');
    expect(bodySent.text).toContain('CircuitBreaker tripped');
    expect(bodySent.text).toContain('https://sentry.io/desmulta/123');
  });
});
