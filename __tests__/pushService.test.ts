import { describe, it, expect, beforeEach, vi } from 'vitest';
import { subscribeToPushNotifications } from '@/lib/communications/pushService';

describe('Servicio Web Push (FinOps/Zero-PII)', () => {
  const mockVapidKey = 'mock-vapid-key';

  beforeEach(() => {
    // Mock del Service Worker y PushManager (Vitest)
    Object.defineProperty(global.navigator, 'serviceWorker', {
      value: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue(null),
            subscribe: vi.fn().mockResolvedValue({ endpoint: 'https://push.test/xyz' }),
          },
        }),
      },
      writable: true,
    });
  });

  it('debe abortar si el navegador no soporta PushManager', async () => {
    // Eliminamos PushManager del window para simular entorno no compatible
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const originalPushManager = (global as any).window.PushManager;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (global as any).window.PushManager;

    const result = await subscribeToPushNotifications(mockVapidKey);
    expect(result).toBeNull();

    // Restaurar
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).window.PushManager = originalPushManager;
  });

  it('debe generar una suscripción nueva exitosamente', async () => {
    // Simulamos entorno compatible
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).window.PushManager = {};
    const result = await subscribeToPushNotifications(mockVapidKey);

    expect(result).not.toBeNull();
    expect(result?.endpoint).toBe('https://push.test/xyz');
  });
});
