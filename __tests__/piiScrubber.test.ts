import { describe, it, expect } from 'vitest';
import { sanitizePII } from '@/lib/security/piiScrubber';

describe('Auditoría DevSecOps: Motor de Sanitización PII', () => {
  it('debe enmascarar placas de vehículos colombianos', () => {
    const rawData = JSON.stringify({ error: 'Fallo al consultar placa MNO-456 en DB' });
    const result = sanitizePII(rawData);
    expect(result).toContain('[PLACA_OCULTA]');
    expect(result).not.toContain('MNO-456');
  });

  it('debe enmascarar números de identificación ciudadana (Cédulas)', () => {
    const rawData = JSON.stringify({ userId: '1098765432', action: 'login' });
    const result = sanitizePII(rawData);
    expect(result).toContain('[DOC_OCULTO]');
    expect(result).not.toContain('1098765432');
  });

  it('debe enmascarar correos electrónicos', () => {
    const rawData = '{"email":"usuario.test@gmail.com"}';
    const result = sanitizePII(rawData);
    expect(result).toContain('[EMAIL_OCULTO]');
    expect(result).not.toContain('usuario.test@gmail.com');
  });
});
