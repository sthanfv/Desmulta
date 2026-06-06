import { describe, it, expect } from 'vitest';
import { sanitizePII } from '@/lib/security/piiScrubber';

describe('PII Scrubber for Colombia', () => {
  it('debe ofuscar placas vehiculares colombianas (ej. ABC123, ABC-123)', () => {
    const text = 'El vehículo con placa ABC123 y el XYZ-987 estuvieron involucrados.';
    expect(sanitizePII(text)).toBe('El vehículo con placa [PLACA_OCULTA] y el [PLACA_OCULTA] estuvieron involucrados.');
  });

  it('debe ofuscar cédulas de ciudadanía (8-10 dígitos)', () => {
    const text = 'El usuario con CC 1020304050 reportó el problema.';
    expect(sanitizePII(text)).toBe('El usuario con CC [DOC_OCULTO] reportó el problema.');
  });

  it('debe ofuscar correos electrónicos', () => {
    const text = 'Contactar a usuario@ejemplo.com.co para más detalles.';
    expect(sanitizePII(text)).toBe('Contactar a [EMAIL_OCULTO] para más detalles.');
  });

  it('no debe alterar texto normal sin PII', () => {
    const text = 'Esto es un texto limpio que no contiene información sensible.';
    expect(sanitizePII(text)).toBe(text);
  });
});
