import { test, expect } from '@playwright/test';

test.describe('Verificación de Seguridad - Hallazgos Críticos P0', () => {
  // [2026-09-22] El scheduler SIMIT se eliminó por cumplimiento: la ruta ya no debe existir
  test('C-1: /api/cron/simit-scheduler ya no existe (scraper SIMIT eliminado)', async ({
    request,
  }) => {
    const response = await request.post('/api/cron/simit-scheduler');
    expect(response.status()).toBe(404);
  });

  test('C-3: /api/internal/calculadora debe bloquear accesos sin INTERNAL_API_SECRET', async ({
    request,
  }) => {
    const response = await request.post('/api/internal/calculadora', {
      data: {
        valorMulta2026: 650000,
        fechaInfraccionISO: '2023-01-01',
        tieneCobroCoactivo: false,
      },
    });
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('No autorizado');
  });

  test('C-2: /api/web-push/register debe bloquear registro de tokens sin autenticación', async ({
    request,
  }) => {
    const response = await request.post('/api/web-push/register', {
      data: {
        docId: 'EXP-1-008',
        fcmToken: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      },
    });
    // Si no enviamos el Bearer Token de Firebase Auth, debe devolver 401
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toContain('No autorizado');
  });
});
