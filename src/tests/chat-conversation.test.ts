import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/chat/route';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { alertServiceFailureInBackground } from '@/lib/monitoring/service-alert';
import { detectSmallTalk, STARTER_QUESTIONS } from '@/lib/chat/small-talk';
import { trimHistory, HISTORY_MAX_MESSAGES, HISTORY_MAX_CHARS } from '@/lib/chat/history';

vi.mock('@/lib/security/ip-utils', () => ({
  getSecureIp: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('@/lib/analytics/demand-tracker', () => ({
  trackDemandQuery: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/monitoring/service-alert', () => ({
  alertServiceFailureInBackground: vi.fn(),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const ALLOWED = { success: true, isError: false };

function chatRequest(message: string, history: Array<{ role: string; content: string }> = []) {
  return new NextRequest('http://localhost/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message, history }),
  });
}

describe('Chat — conversación natural y respaldos sin leyes de relleno', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AGENT_AI_URL = 'http://agent.test';
    process.env.AGENT_HMAC_SECRET = 'test-hmac-secret-0123456789abcdef0123456789';
    vi.mocked(checkRateLimit).mockResolvedValue(ALLOWED as never);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ reply: 'Respuesta del agente', citations: [], trace_id: 'x' }),
    });
  });

  it('"hola" recibe un saludo humano sin llamar al agente, sin leyes y sin gastar cupo diario', async () => {
    const res = await POST(chatRequest('hola'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(data.reply).toContain('¡Hola!');
    expect(data.reply).not.toMatch(/Ley|Sentencia|Art\./);
    expect(data.citations).toEqual([]);
    expect(data.suggested_action).toBeNull();
    expect(data.follow_up_questions).toEqual(STARTER_QUESTIONS);
    expect(vi.mocked(checkRateLimit).mock.calls.map((c) => c[0])).toEqual(['chatAgent']);
  });

  it('una consulta real sí va al agente y consume el cupo diario', async () => {
    const res = await POST(chatRequest('hola, me llegó una fotomulta'));
    const data = await res.json();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(data.reply).toBe('Respuesta del agente');
    expect(vi.mocked(checkRateLimit).mock.calls.map((c) => c[0])).toEqual([
      'chatAgent',
      'chatAgentDaily',
    ]);
  });

  it('si el agente responde error, el ciudadano recibe un mensaje honesto con WhatsApp (no un párrafo legal)', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 413, json: async () => ({}) });
    const res = await POST(chatRequest('¿Cuándo prescribe mi comparendo?'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.reply).not.toMatch(/Ley 1843|C-038|Art\./);
    expect(data.suggested_action.tipo).toBe('whatsapp');
    expect(data.suggested_action.url).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);
    expect(data.citations).toEqual([]);
    expect(alertServiceFailureInBackground).toHaveBeenCalledWith(
      'chat',
      'Motor IA respondió HTTP 413',
      expect.objectContaining({ traceId: expect.any(String) })
    );
  });

  it('si el agente no responde (timeout/red) también hay respaldo humano y alerta', async () => {
    mockFetch.mockRejectedValueOnce(new Error('The operation was aborted due to timeout'));
    const res = await POST(chatRequest('Tengo un embargo por multas'));
    const data = await res.json();

    expect(data.suggested_action.tipo).toBe('whatsapp');
    expect(alertServiceFailureInBackground).toHaveBeenCalledWith(
      'chat',
      'Motor IA sin respuesta (timeout o red)',
      expect.anything()
    );
  });

  it('si el agente devuelve una respuesta vacía se usa el respaldo', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ reply: '  ' }) });
    const data = await (await POST(chatRequest('¿Qué es el RUNT?'))).json();
    expect(data.suggested_action.tipo).toBe('whatsapp');
  });

  it('sin configuración del agente, un saludo igual recibe respuesta amable', async () => {
    delete process.env.AGENT_HMAC_SECRET;
    const data = await (await POST(chatRequest('gracias'))).json();
    expect(data.reply).toContain('gusto');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('ráfaga de mensajes → 429 con mensaje cercano y salida por WhatsApp', async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ success: false, isError: false } as never);
    const res = await POST(chatRequest('¿Cuándo prescribe?'));
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.isRateLimited).toBe(true);
    expect(data.reply).toContain('Vas muy rápido');
    expect(data.suggested_action.tipo).toBe('whatsapp');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('cupo diario agotado → 429 que ofrece continuar por WhatsApp', async () => {
    vi.mocked(checkRateLimit)
      .mockResolvedValueOnce(ALLOWED as never)
      .mockResolvedValueOnce({ success: false, isError: false } as never);
    const res = await POST(chatRequest('¿Cuándo prescribe?'));
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.reply).toContain('Por hoy llegaste al límite');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('si Redis falla (fail-closed) se bloquea y se alerta al equipo', async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ success: false, isError: true } as never);
    const res = await POST(chatRequest('¿Cuándo prescribe?'));
    expect(res.status).toBe(429);
    expect(alertServiceFailureInBackground).toHaveBeenCalledWith(
      'chat',
      'Rate limiter (Upstash) no disponible'
    );
  });

  it('el historial enviado al agente se acota (memoria sin superar el límite del agente)', async () => {
    const history = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `mensaje ${i} ` + 'x'.repeat(3000),
    }));
    await POST(chatRequest('¿Y si ya prescribió?', history));

    const sent = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(sent.history.length).toBeLessThanOrEqual(HISTORY_MAX_MESSAGES);
    expect(sent.history.at(-1).content.startsWith('mensaje 19')).toBe(true);
    expect(new TextEncoder().encode(mockFetch.mock.calls[0][1].body as string).length).toBeLessThan(
      32 * 1024
    );
  });
});

describe('detectSmallTalk', () => {
  it.each([
    ['hola', 'greeting'],
    ['Buenas tardes', 'greeting'],
    ['¿cómo estás?', 'wellbeing'],
    ['muchas gracias!', 'thanks'],
    ['chao', 'farewell'],
    ['¿quién eres?', 'identity'],
  ])('%s → %s', (text, kind) => {
    expect(detectSmallTalk(text)).toBe(kind);
  });

  it.each([
    'hola, me llegó una fotomulta',
    'buenos días, tengo un embargo',
    '¿Cuánto cuesta la plantilla?',
    '',
  ])('"%s" no es charla corta', (text) => {
    expect(detectSmallTalk(text)).toBeNull();
  });
});

describe('trimHistory', () => {
  it('conserva los últimos mensajes, recorta los largos y respeta el presupuesto', () => {
    const history = Array.from({ length: 15 }, (_, i) => ({
      role: 'user' as const,
      content: `${i}-` + 'a'.repeat(5000),
    }));
    const out = trimHistory(history, { message: 'hola' }, 8000);

    expect(out.length).toBeGreaterThan(0);
    expect(out.length).toBeLessThanOrEqual(HISTORY_MAX_MESSAGES);
    expect(out.every((m) => m.content.length <= HISTORY_MAX_CHARS + 1)).toBe(true);
    expect(out.at(-1)?.content.startsWith('14-')).toBe(true);
    expect(JSON.stringify({ message: 'hola', history: out }).length).toBeLessThanOrEqual(8000);
  });

  it('sin historial devuelve lista vacía', () => {
    expect(trimHistory(undefined, { message: 'x' }, 1000)).toEqual([]);
  });
});
