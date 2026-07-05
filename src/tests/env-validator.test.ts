import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateEnvVariables as validateEnv } from '../lib/env-validator';

describe('Env Validator', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('debe lanzar error si faltan variables críticas agregadas en la v2', () => {
    process.env.NODE_ENV = 'production';
    process.env.CI = 'false';
    // Simulamos un entorno con algunas variables pero sin las nuevas requeridas
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test';
    process.env.TURNSTILE_SECRET_KEY = 'test';
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'test';
    process.env.CLIENT_PORTAL_JWT_SECRET = '1234567890123456';
    process.env.VIP_JWT_SECRET = '1234567890123456';
    process.env.BLOB_READ_WRITE_TOKEN = 'test';
    process.env.INTERNAL_API_SECRET = '1234567890123456';

    // Falta CRON_SECRET, COOKIE_SIGNATURE_SECRET, etc.
    expect(() => validateEnv()).toThrow();
  });

  it('debe validar exitosamente si todas las variables requeridas están presentes', () => {
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test';
    process.env.TURNSTILE_SECRET_KEY = 'test';
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'test';
    process.env.CLIENT_PORTAL_JWT_SECRET = '1234567890123456';
    process.env.VIP_JWT_SECRET = '1234567890123456';
    process.env.BLOB_READ_WRITE_TOKEN = 'test';
    process.env.INTERNAL_API_SECRET = '1234567890123456';

    // Variables de la auditoría v2
    process.env.COOKIE_SIGNATURE_SECRET = '12345678901234567890123456789012'; // 32 chars
    process.env.CRON_SECRET = '12345678901234567890'; // 20 chars
    process.env.OPERATOR_PIN = '1234';
    process.env.TELEGRAM_WEBHOOK_SECRET = '12345678901234567890'; // 20 chars

    // Debe correr sin lanzar excepción
    expect(() => validateEnv()).not.toThrow();
  });
});
