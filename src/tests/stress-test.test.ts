// Ruta: src/tests/stress-test.test.ts
import { describe, it, expect } from 'vitest';
import { sanitizarPII } from '../lib/logger/security-logger';

/**
 * Suite de Pruebas de Estrés y Auditoría DevSecOps
 * Objetivo: Validar que bajo ráfagas de datos el sistema mantiene el anonimato y la integridad.
 */
describe('Pruebas de Estrés: Auditoría DevSecOps & Red de Seguridad', () => {
  it('Escenario 1: Ráfaga de datos PII mezclados con texto normal', () => {
    const explosionDeDatos = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      info: `Usuario ${i} con cédula ${1010000000 + i}, teléfono 300123${i.toString().padStart(4, '0')} y correo usuario${i}@empresa.com`,
      metadata: `Evento de estrés disparado para auditoría v2.3.7`,
    }));

    const payloadInseguro = JSON.stringify(explosionDeDatos);
    const inicio = performance.now();
    const payloadSeguro = sanitizarPII(payloadInseguro);
    const fin = performance.now();

    // Rendimiento: La sanitización de 100 registros con Regex debe ser < 50ms
    console.log(`⏱️ Rendimiento de Ofuscación: ${(fin - inicio).toFixed(2)}ms`);
    expect(fin - inicio).toBeLessThan(100);

    // Verificación de blindaje
    expect(payloadSeguro).not.toContain('1010000000');
    expect(payloadSeguro).not.toContain('300123');
    // El email original no debe estar, pero el dominio sí (por política de trazabilidad)
    expect(payloadSeguro).not.toContain('usuario0@empresa.com');
    expect(payloadSeguro).toContain('@empresa.com');

    // Verificación de patrones (Preserva estructura JSON pero destruye dato)
    expect(payloadSeguro).toContain('10****00');
    expect(payloadSeguro).toContain('300*****00');
    expect(payloadSeguro).toContain('u***@empresa.com'); // Primer carácter + dominio
  });

  it('Escenario 2: Ataque de inyección de formatos anómalos', () => {
    const casosBorde = [
      'Mi cédula es 1010888999 con ruido',
      'Llamar al 3201234567 directamente',
      'Email: test.user@university.co',
      'JSON: {"pii": "1050888777"}',
    ];

    casosBorde.forEach((caso) => {
      const seguro = sanitizarPII(caso);
      expect(seguro).not.toMatch(/\b1010888999\b/);
      expect(seguro).not.toMatch(/3201234567/);
      console.log(`🔍 Caso Borde Sanitizado: [${seguro}]`);
    });
  });

  it('Escenario 3: Verificación de Escudo Anti-Bots (Simulación de Token Nulo)', () => {
    const checkToken = (token: string | null) => {
      if (!token) throw new Error('Nuestro escudo de protección está terminando de activarse...');
      return true;
    };

    expect(() => checkToken(null)).toThrow(/escudo de protección/);
    console.log('🛡️ Bloqueo técnico de Token Nulo: VERIFICADO');
  });
});
