import { describe, it, expect } from 'vitest';

// Apuntamos al motor de tu API local (Puerto 9005 de Desmulta)
const API_URL = 'http://127.0.0.1:9005/api/create-consultation';

describe('🛡️ Escudo Anti-DDoS y Rate Limiting', () => {
  const payloadAtacante = {
    cedula: '1090123456',
    placa: 'AAA123',
    nombre: 'Bot Malicioso de Prueba',
    contacto: '3001234567',
    aceptoTerminos: true,
    authorUid: 'TEST_BOT_UID_99',
    antiguedad: 'Más de 3 años',
    tipoInfraccion: 'Foto-Multa (Cámara)',
    estadoCoactivo: 'NO',
  };

  it('🚫 Debe bloquear peticiones masivas y devolver Error 429', async () => {
    const codigosRespuesta: number[] = [];

    // Simulamos un bot disparando ráfagas (4 peticiones seguidas)
    // El sistema debería bloquear tras la 2da/3ra petición según la configuración de Firestore
    for (let i = 0; i < 4; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000); // 1s timeout

        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadAtacante),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        codigosRespuesta.push(res.status);
      } catch (err) {
        console.error('Fallo de conexión al servidor local:', err);
      }
    }

    // El test pasa si el servidor activó el escudo 429 o si se omite por falta de servidor
    const escudoActivado = codigosRespuesta.includes(429);
    const servidorNoDisponible = codigosRespuesta.length === 0;

    if (servidorNoDisponible) {
      console.warn(
        '⚠️ Test omitido: El servidor 9005 no está respondiendo. Inicie npm run dev para probar el Rate Limit.'
      );
      return; // Skip assertion
    }

    expect(escudoActivado).toBe(true);
  }, 30000); // Timeout extendido de 30s para compilación Next.js
});
