import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
}));

vi.mock('@upstash/redis', () => {
  return {
    Redis: {
      fromEnv: () => ({
        get: mocks.get,
        set: mocks.set,
      }),
    },
  };
});

import { BusinessCache } from '../redis-business';

describe('BusinessCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe generar el mismo hash para objetos con llaves en distinto orden (Determinismo)', async () => {
    const payloadA = { placa: 'XYZ123', fecha: '2023-01-01' };
    const payloadB = { fecha: '2023-01-01', placa: 'XYZ123' };

    mocks.get.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    await BusinessCache.get('test', payloadA);
    await BusinessCache.get('test', payloadB);

    const callA = mocks.get.mock.calls[0][0];
    const callB = mocks.get.mock.calls[1][0];

    expect(callA).toBe(callB); // El hash generado debe ser exactamente el mismo
    expect(callA).toContain('desmulta:cache:test:');
  });

  it('debe retornar null y no romper la aplicación si Redis falla (Fail-Open)', async () => {
    mocks.get.mockRejectedValue(new Error('Conexión perdida con Upstash'));

    const result = await BusinessCache.get('go-engine', { test: 1 });

    expect(result).toBeNull(); // Se tragó el error elegantemente
  });

  it('debe devolver los datos en un Cache Hit', async () => {
    const mockData = { total: 1000 };
    mocks.get.mockResolvedValue(mockData);

    const result = await BusinessCache.get('go-engine', { test: 1 });

    expect(result).toEqual(mockData);
    expect(mocks.get).toHaveBeenCalledTimes(1);
  });
});
