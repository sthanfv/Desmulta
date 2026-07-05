import { describe, it, expect } from 'vitest';
import { ConsultationSchema } from '../lib/definitions';

describe('MANDATO-FILTRO: Seguridad de Datos y Anti-Bot', () => {
  const validData = {
    cedula: '12345678',
    nombre: 'Usuario Test',
    contacto: '3001234567',
    aceptoTerminos: true,
    antiguedad: 'Más de 3 años',
    tipoInfraccion: 'Foto-Multa (Cámara)',
    estadoCoactivo: 'NO',
    turnstileToken: 'valid-token-123',
    websiteHoneypot: '', // Honeypot vacío
  };

  it('✅ Debe validar correctamente con datos legítimos y token', () => {
    const result = ConsultationSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('✅ Debe permitir el paso en el esquema (validación delegada al controlador)', () => {
    const dataWithoutToken = { ...validData, turnstileToken: undefined };
    const result = ConsultationSchema.safeParse(dataWithoutToken);
    // Ahora el esquema es flexible para permitir el flujo al controlador onSubmit
    expect(result.success).toBe(true);
  });

  it('⚠️ Debe permitir el paso en el esquema (Honeypot capturado en API)', () => {
    const dataWithBotInput = { ...validData, websiteHoneypot: 'im-a-bot' };
    const result = ConsultationSchema.safeParse(dataWithBotInput);
    // Zod lo permite para que el controlador pueda retornar un 200 falso al bot
    expect(result.success).toBe(true);
  });

  it('❌ Debe rechazar cédulas con caracteres no numéricos (SQL Injection Prevention)', () => {
    const maliciousCedula = { ...validData, cedula: "12345'; DROP TABLE users--" };
    const result = ConsultationSchema.safeParse(maliciousCedula);
    expect(result.success).toBe(false);
  });
});
