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

    // Verificamos que el mensaje incluya la directiva pedagógica sin presionar a ventas
    expect(payload.message).toContain('[DIRECTIVA DE SISTEMA OCULTA]');
    expect(payload.message).toContain('sin ser insistente con ventas');
    expect(payload.message).not.toContain('adquiriendo las plantillas');
  });

  it('Debe inyectar la directiva comercial/ventas para preguntas con intención de solución (ej. cómo impugnar)', async () => {
    const req = createMockRequest('¿Cómo impugno una fotomulta?');
    await POST(req);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const fetchCall = mockFetch.mock.calls[0];
    const payloadStr = fetchCall[1].body as string;
    const payload = JSON.parse(payloadStr);

    // Verificamos que el mensaje obligue a persuadir la compra de plantillas o asesoría
    expect(payload.message).toContain('[DIRECTIVA DE SISTEMA OCULTA]');
    expect(payload.message).toContain('adquiriendo las plantillas de Desmulta');
    expect(payload.message).toContain('contratando la asesoría');
    expect(payload.message).toContain('NO des la solución directa');
  });

  it('Debe detectar correctamente múltiples variaciones de intención comercial (prescripción, embargo)', async () => {
    const keywords = ['qué hago con este embargo', 'solucionar mi caso', 'aplicar la prescripción'];

    for (const msg of keywords) {
      mockFetch.mockClear();
      const req = createMockRequest(msg);
      await POST(req);

      const payloadStr = mockFetch.mock.calls[0][1].body as string;
      const payload = JSON.parse(payloadStr);

      expect(payload.message).toContain('NO des la solución directa');
    }
  });
});
