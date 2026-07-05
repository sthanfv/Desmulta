import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/telemetry/route';
import { NextRequest } from 'next/server';

// Mock de process.env
process.env.TELEGRAM_BOT_TOKEN = 'mock-token';
process.env.TELEGRAM_CHAT_ID = 'mock-chat-id';

// Mock del fetch global
global.fetch = vi.fn();

// Mock de Firestore / Cooldowns para probar Rate Limit sin depender de Upstash real ni Firestore real en este test
const mockCooldowns = new Map<string, unknown>();

vi.mock('@/lib/security/rate-limit', () => ({
  rateLimit: vi.fn(async (identifier, limit, windowMs) => {
    const data = mockCooldowns.get(identifier) as { count: number; expiresAt: number } | undefined;
    const now = Date.now();

    if (data && data.expiresAt > now) {
      if (data.count >= limit) {
        return {
          success: false,
          blocked: true,
          remaining: 0,
          reset: data.expiresAt - now,
          totalRequests: data.count,
          isError: false,
        };
      }
      const newCount = data.count + 1;
      mockCooldowns.set(identifier, { count: newCount, expiresAt: data.expiresAt });
      return {
        success: true,
        blocked: false,
        remaining: limit - newCount,
        reset: data.expiresAt - now,
        totalRequests: newCount,
        isError: false,
      };
    } else {
      const expiresAt = now + windowMs;
      mockCooldowns.set(identifier, { count: 1, expiresAt });
      return {
        success: true,
        blocked: false,
        remaining: limit - 1,
        reset: windowMs,
        totalRequests: 1,
        isError: false,
      };
    }
  }),
  checkRateLimit: vi.fn(() =>
    Promise.resolve({
      success: true,
      blocked: false,
      limit: 5,
      remaining: 5,
      resetTime: 0,
      isError: false,
    })
  ),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: vi.fn(() => ({
      doc: vi.fn((docId) => ({
        id: docId,
        get: vi.fn().mockImplementation(async () => {
          const data = mockCooldowns.get(docId);
          return {
            exists: !!data,
            data: () => data,
          };
        }),
        set: vi.fn().mockImplementation(async (data, options) => {
          if (options?.merge && mockCooldowns.has(docId)) {
            mockCooldowns.set(docId, { ...mockCooldowns.get(docId), ...data });
          } else {
            mockCooldowns.set(docId, data);
          }
        }),
      })),
    })),
    runTransaction: vi.fn().mockImplementation(async (updateFunction) => {
      // Mock básico de transaction
      const t = {
        get: vi.fn().mockImplementation(async (docRef) => await docRef.get()),
        set: vi.fn().mockImplementation((docRef, data, options) => docRef.set(data, options)),
        update: vi.fn().mockImplementation((docRef, data) => {
          const currentData = mockCooldowns.get(docRef.id) || {};
          mockCooldowns.set(docRef.id, { ...currentData, ...data });
        }),
      };
      return await updateFunction(t);
    }),
  })),
  FieldValue: {
    serverTimestamp: vi.fn(() => ({
      toMillis: () => Date.now(),
    })),
  },
  Timestamp: {
    now: vi.fn(() => ({
      toMillis: () => Date.now(),
      toDate: () => new Date(),
    })),
    fromDate: vi.fn((date) => ({
      toMillis: () => date.getTime(),
      toDate: () => date,
    })),
    fromMillis: vi.fn((ms) => ({
      toMillis: () => ms,
      toDate: () => new Date(ms),
    })),
  },
}));

vi.mock('@/lib/firebase-admin', () => ({
  getAdminApp: vi.fn(),
}));

function createMockRequest(body: Record<string, unknown>, ip: string = '127.0.0.1') {
  return new Request('http://localhost/api/telemetry', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(body),
  });
}

describe('📡 Endpoint de Telemetría (Lead Capture)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCooldowns.clear();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      text: async () => 'OK',
    });
  });

  const validPayload = {
    date: '2020-01-01',
    coactivo: true,
    status: 'ALERTA',
    probability: '70% - Alerta',
    contacto: '3001234567',
    nombre: 'Juan Pérez',
  };

  it('✅ Debe retornar 200 y llamar a Telegram con un payload válido', async () => {
    const req = createMockRequest(validPayload, 'ip-1');
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const fetchArgs = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(fetchArgs[0]).toContain(process.env.TELEGRAM_BOT_TOKEN);

    const body = JSON.parse(fetchArgs[1].body);
    expect(body.text).toContain('Juan Pérez');
    expect(body.text).toContain('3001234567');
  });

  it('🚫 Debe rechazar payload con contacto inválido (Zod)', async () => {
    const invalidPayload = { ...validPayload, contacto: '123' }; // muy corto
    const req = createMockRequest(invalidPayload, 'ip-2');
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Esquema de payload inválido');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('🤖 Debe activar el Honeypot y retornar falso 200 sin llamar a Telegram', async () => {
    const honeypotPayload = { ...validPayload, website_hp: 'soy un bot' };
    const req = createMockRequest(honeypotPayload, 'ip-3');
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.fake).toBe(true);
    expect(global.fetch).not.toHaveBeenCalled(); // 🚨 Crucial: Telegram no se toca
  });

  it('🛡️ Debe escapar caracteres HTML en el nombre (Sanitización)', async () => {
    const xssPayload = { ...validPayload, nombre: '<script>alert(1)</script>Juan' };
    const req = createMockRequest(xssPayload, 'ip-4');
    await POST(req);

    const fetchArgs = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(fetchArgs[1].body);
    expect(body.text).not.toContain('<script>');
    expect(body.text).toContain('scriptalert\\(1\\)/scriptJuan');
  });

  it('🛑 Rate Limit: Debe bloquear peticiones masivas de la misma IP', async () => {
    const ip = 'ip-flood';
    const reqMaker = () => createMockRequest(validPayload, ip);

    // 1ra peticion
    let res = await POST(reqMaker());
    expect(res.status).toBe(200);

    // 2da peticion
    res = await POST(reqMaker());
    expect(res.status).toBe(200);

    // 3ra peticion
    res = await POST(reqMaker());
    expect(res.status).toBe(200);

    // 4ta peticion - DEBE FALLAR (Max 3/dia)
    res = await POST(reqMaker());
    expect(res.status).toBe(429);

    const json = await res.json();
    expect(json.error).toContain('Demasiadas solicitudes');
  });
});
