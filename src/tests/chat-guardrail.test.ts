import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/chat/route';

// Mock dependencies
vi.mock('@/lib/security/ip-utils', () => ({
  getSecureIp: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/lib/analytics/demand-tracker', () => ({
  trackDemandQuery: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/telegram', () => ({
  sendTelegramAgentAlert: vi.fn().mockResolvedValue(undefined),
}));

// Mock global fetch to intercept the request to the Python microservice
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Chat API Guardrail Injection (Sales vs Pedagogy)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // [2026-09-22] La ruta ya no tiene secreto HMAC por defecto: el test debe proveerlo
    process.env.AGENT_AI_URL = 'http://agent.test';
    process.env.AGENT_HMAC_SECRET = 'test-hmac-secret-0123456789abcdef0123456789';
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ reply: 'Mock AI Response', trace_id: '123' }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createMockRequest = (message: string) => {
    return new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        city: 'bogota',
        history: [],
      }),
    });
  };

  it('Debe inyectar la directiva pedagógica para preguntas informativas sin intención de solución', async () => {
    const req = createMockRequest('¿Qué es el RUNT?');
    await POST(req);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const fetchCall = mockFetch.mock.calls[0];
    const payloadStr = fetchCall[1].body as string;
    const payload = JSON.parse(payloadStr);

    // Verificamos que el mensaje del usuario quede aislado de la directiva pedagógica
    expect(payload.message).toBe('¿Qué es el RUNT?');
    expect(payload.system_directive).toContain('sin ser insistente con ventas');
    expect(payload.system_directive).not.toContain('adquiriendo las plantillas');
  });

  it('Debe inyectar la directiva comercial/ventas para preguntas con intención de solución (ej. cómo impugnar)', async () => {
    const req = createMockRequest('¿Cómo impugno una fotomulta?');
    await POST(req);

    const payloadStr = mockFetch.mock.calls[0][1].body as string;
    const payload = JSON.parse(payloadStr);

    // Verificamos el aislamiento del plano de control
    expect(payload.message).toBe('¿Cómo impugno una fotomulta?');
    expect(payload.system_directive).toContain('adquiriendo las plantillas de Desmulta');
    expect(payload.system_directive).toContain('contratando la asesoría');
    expect(payload.system_directive).toContain('NO des la solución directa');
  });

  it('Debe detectar correctamente múltiples variaciones de intención comercial (prescripción, embargo)', async () => {
    const keywords = ['qué hago con este embargo', 'solucionar mi caso', 'aplicar la prescripción'];

    for (const keyword of keywords) {
      mockFetch.mockClear();
      const req = createMockRequest(keyword);
      await POST(req);

      const payloadStr = mockFetch.mock.calls[0][1].body as string;
      const payload = JSON.parse(payloadStr);

      expect(payload.message).toBe(keyword);
      expect(payload.system_directive).toContain('NO des la solución directa');
    }
  });
});
