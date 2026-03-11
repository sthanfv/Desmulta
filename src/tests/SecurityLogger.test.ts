// Ruta: src/tests/SecurityLogger.test.ts
import { describe, it, expect } from 'vitest';
import { sanitizarPII } from '../lib/logger/security-logger';

describe('Auditoría DevSecOps: Motor de Ofuscación PII (SecurityLogger)', () => {
  
  it('Debe enmascarar números de teléfono móvil de Colombia (+57 y locales)', () => {
    const logInseguro = "El usuario con número +57 3201234567 no pudo subir la captura del SIMIT.";
    const logSeguro = sanitizarPII(logInseguro);
    
    // Verificamos que el número real NO exista en el log de salida
    expect(logSeguro).not.toContain('3201234567');
    // Verificamos que el patrón ofuscado sea correcto
    expect(logSeguro).toContain('+57 320*****67');
  });

  it('Debe enmascarar Cédulas de Ciudadanía colombianas', () => {
    const logInseguro = "Carga de documento para la cédula 1090123456 rechazada por timeout.";
    const logSeguro = sanitizarPII(logInseguro);
    
    expect(logSeguro).not.toContain('1090123456');
    expect(logSeguro).toContain('10****56');
  });

  it('Debe enmascarar correos electrónicos de los leads', () => {
    const logInseguro = "Nuevo lead registrado: fabian.desmulta@gmail.com en base de datos.";
    const logSeguro = sanitizarPII(logInseguro);
    
    expect(logSeguro).not.toContain('fabian.desmulta@gmail.com');
    expect(logSeguro).toContain('f***@gmail.com');
  });

  it('Debe manejar múltiples datos sensibles en una sola carga útil (JSON simulado)', () => {
    const payloadInseguro = '{"nombre": "Carlos", "cedula": "1010888999", "telefono": "3009998877", "error": "Fallo en Gemini AI"}';
    const logSeguro = sanitizarPII(payloadInseguro);
    
    expect(logSeguro).not.toContain('1010888999');
    expect(logSeguro).not.toContain('3009998877');
    expect(logSeguro).toContain('10****99');
    expect(logSeguro).toContain('300*****77');
  });
});
