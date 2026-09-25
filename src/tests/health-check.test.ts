import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getHealthReport,
  resetHealthCache,
  HEALTH_CACHE_MS,
  HEALTH_TIMEOUT_MS,
} from '@/lib/monitoring/health';

describe('🩺 Chequeo de salud para el monitor externo', () => {
  beforeEach(() => {
    resetHealthCache();
    vi.useRealTimers();
  });

  it('reporta ok cuando Firestore responde', async () => {
    const report = await getHealthReport(async () => ({}));
    expect(report.status).toBe('ok');
    expect(report.checks.firestore).toBe('ok');
  });

  it('reporta degradado cuando Firestore falla, sin exponer el error', async () => {
    const report = await getHealthReport(async () => {
      throw new Error('PERMISSION_DENIED detalle interno');
    });
    expect(report.status).toBe('degradado');
    expect(JSON.stringify(report)).not.toContain('PERMISSION_DENIED');
  });

  it('reporta degradado si Firestore tarda más del límite', async () => {
    vi.useFakeTimers();
    const pending = getHealthReport(() => new Promise(() => {}));
    await vi.advanceTimersByTimeAsync(HEALTH_TIMEOUT_MS + 10);
    expect((await pending).checks.firestore).toBe('falla');
  });

  it('reutiliza el resultado durante la ventana de caché para no gastar lecturas', async () => {
    let t = 1_000;
    const probe = vi.fn(async () => ({}));
    await getHealthReport(probe, () => t);
    t += HEALTH_CACHE_MS - 1;
    await getHealthReport(probe, () => t);
    expect(probe).toHaveBeenCalledTimes(1);
    t += 2;
    await getHealthReport(probe, () => t);
    expect(probe).toHaveBeenCalledTimes(2);
  });
});
