import { describe, it, expect } from 'vitest';

// Apuntamos al motor de tu API local (Puerto 9005 de Desmulta)
const API_URL = 'http://127.0.0.1:9006/api/create-consultation';

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
                const res = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payloadAtacante),
                });
                codigosRespuesta.push(res.status);
            } catch (err) {
                console.error('Fallo de conexión al servidor local:', err);
            }
        }

        // El test pasa si el servidor activó el escudo 429
        const escudoActivado = codigosRespuesta.includes(429);

        if (!escudoActivado) {
            console.warn('⚠️ No se detectó 429. ¿Está el servidor corriendo en el puerto 9005 y con Firestore activo?');
        }

        expect(escudoActivado).toBe(true);
    }, 30000); // Timeout extendido de 30s para compilación Next.js
});
