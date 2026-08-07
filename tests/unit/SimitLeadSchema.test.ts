import { describe, it, expect } from 'vitest';
import { SimitLeadSchema } from '../../src/lib/schemas';

describe('SimitLeadSchema - Security Audit V2', () => {
  it('Debe aceptar monto_base y fecha_infraccion, y transformar el celular', () => {
    const rawPayload = {
      tipo: 'SIMIT_LEAD',
      contacto: '300 123 4567', // formato con espacios
      nombre: 'Juan <script>alert xss</script>', // intento de XSS
      monto_base: 500000,
      fecha_infraccion: '2020-05-15',
    };

    const parsed = SimitLeadSchema.safeParse(rawPayload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.contacto).toBe('3001234567'); // stripped non-digits
      expect(parsed.data.monto_base).toBe(500000);
      expect(parsed.data.fecha_infraccion).toBe('2020-05-15');
      expect(parsed.data.nombre).not.toContain('<script>');
    }
  });

  it('Debe rechazar la inyección comercial del cliente (deuda_total)', () => {
    const maliciousPayload = {
      tipo: 'SIMIT_LEAD',
      contacto: '3001234567',
      monto_base: 500000,
      fecha_infraccion: '2020-05-15',
      deuda_total: 0,          // Atacante intenta forzar 0
    };

    const parsed = SimitLeadSchema.safeParse(maliciousPayload);
    // Como pusimos z.undefined().optional(), si viene un number va a fallar.
    expect(parsed.success).toBe(false);
  });
  
  it('Debe rechazar la inyección comercial del cliente (ahorro_potencial)', () => {
    const maliciousPayload = {
      tipo: 'SIMIT_LEAD',
      contacto: '3001234567',
      monto_base: 500000,
      fecha_infraccion: '2020-05-15',
      ahorro_potencial: 9999999,
    };

    const parsed = SimitLeadSchema.safeParse(maliciousPayload);
    expect(parsed.success).toBe(false);
  });
});
