import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { fetchWithTrace } from '@/lib/network/fetch-interceptor';
import { logger } from '@/lib/logger/security-logger';

// Mock next/headers
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(
    new Map([
      ['x-trace-id', 'test-trace-id'],
      ['host', 'test.com'],
      ['user-agent', 'test-agent'],
    ])
  ),
}));

// Mock logger
vi.mock('@/lib/logger/security-logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('fetchWithTrace', () => {
  let globalFetch: Mock;

  beforeEach(() => {
    globalFetch = vi.fn();
    global.fetch = globalFetch;
    vi.clearAllMocks();
  });

  it('injects X-Trace-Id header and returns ok response', async () => {
    globalFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as any);

    const res = await fetchWithTrace('https://api.example.com', {
      microserviceName: 'Test Service',
    });

    expect(globalFetch).toHaveBeenCalledTimes(1);
    const fetchCallArgs = globalFetch.mock.calls[0];
    const fetchHeaders = fetchCallArgs[1].headers;

    expect(fetchHeaders.get('X-Trace-Id')).toBe('test-trace-id');
    expect(logger.error).not.toHaveBeenCalled();
    expect(res.ok).toBe(true);
  });

  it('logs structured error via security-logger when response is not ok', async () => {
    globalFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Simulated failure', traceId: 'test-trace-id' }),
    } as any);

    await fetchWithTrace('https://api.example.com', {
      microserviceName: 'Failing Service',
      originalPayload: { some: 'data' },
    });

    expect(logger.error).toHaveBeenCalledTimes(1);

    const [logMsg, logCtx] = (logger.error as Mock).mock.calls[0];
    expect(logMsg).toContain('Falla en solicitud de red');
    expect(logCtx.traceId).toBe('test-trace-id');
    expect(logCtx.microservice).toBe('Failing Service');
    expect(logCtx.payload.some).toBe('data');
    expect(logCtx.error).toContain('Simulated failure');
  });

  it('logs network exception (e.g. timeout) properly', async () => {
    globalFetch.mockRejectedValueOnce(new Error('Network timeout'));

    await expect(
      fetchWithTrace('https://api.example.com', {
        microserviceName: 'Timeout Service',
      })
    ).rejects.toThrow('Network timeout');

    expect(logger.error).toHaveBeenCalledTimes(1);
    const [logMsg, logCtx] = (logger.error as Mock).mock.calls[0];
    expect(logMsg).toContain('Falla total de red');
    expect(logCtx.error).toBe('Network timeout');
  });
});
