import { test, expect } from '@playwright/test';

test.describe('Seguridad API QR', () => {
  test('debe rechazar un payload mayor a 500 caracteres (Amplification Attack)', async ({ request }) => {
    const payloadGigante = 'A'.repeat(501);
    const response = await request.get(`/api/qr?data=${payloadGigante}`);
    
    expect(response.status()).toBe(400);
    const text = await response.text();
    expect(text).toContain('Missing or invalid data parameter');
  });

  test('debe aplicar rate limiting por IP (30 peticiones por minuto)', async ({ request }) => {
    // Nota: Como estamos en e2e, enviamos requests rápidos. 
    // Como Vercel/Next manejan el x-forwarded-for, la IP será la misma (localhost).
    let lastStatus = 200;
    
    // Disparamos 32 requests para asegurar que pase el límite de 30
    for (let i = 0; i < 32; i++) {
      const response = await request.get('/api/qr?data=test');
      lastStatus = response.status();
      // Si recibimos un 429 tempranamente (quizás por ejecuciones paralelas), rompemos el loop
      if (lastStatus === 429) break;
    }
    
    expect(lastStatus).toBe(429);
  });
});
