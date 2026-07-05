/**
 * Suite de Pruebas Unitarias: Túnel de Criptografía Asimétrica (E2EE)
 * Verifica que los payloads sensibles viajen ofuscados con RSA2048 y
 * se desencripten inmaculadamente en el servidor sin corromper la memoria.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import crypto from 'crypto';
import { encryptE2EPayload } from '@/lib/security/client-crypto';
import { decryptE2EPayload } from '@/lib/security/server-crypto';

describe('🛡️ E2EE Cryptographic Tunnel (RSA-OAEP 2048)', () => {
  let tempPublicKey: string;
  let tempPrivateKey: string;

  beforeAll(() => {
    // Generar un par de llaves asimétricas efímeras para el ciclo de pruebas
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    tempPublicKey = publicKey;
    tempPrivateKey = privateKey;

    vi.stubEnv('NEXT_PUBLIC_RSA_KEY', tempPublicKey);
    vi.stubEnv('RSA_PRIVATE_KEY', tempPrivateKey);

    // Inyectar polyfills para el entorno jsdom en Vitest si faltan
    if (typeof window !== 'undefined') {
      if (!window.crypto || !window.crypto.subtle) {
        Object.defineProperty(window, 'crypto', {
          value: crypto.webcrypto,
        });
      }
      if (!window.atob) {
        window.atob = (s) => Buffer.from(s, 'base64').toString('binary');
      }
      if (!window.btoa) {
        window.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
      }
    } else {
      globalThis.window = {
        crypto: crypto.webcrypto,
        atob: (s: string) => Buffer.from(s, 'base64').toString('binary'),
        btoa: (s: string) => Buffer.from(s, 'binary').toString('base64'),
      } as any;
    }
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it('debe encriptar en el Frontend y desencriptar exactamente el mismo payload en el Backend', async () => {
    const originalPII = { cedula: '1102345678', contacto: '3009876543' };

    // 1. Simula el navegador encriptando
    const encryptedBase64 = await encryptE2EPayload(originalPII);

    expect(typeof encryptedBase64).toBe('string');
    expect(encryptedBase64).not.toContain('1102345678'); // No debe ser legible
    expect(encryptedBase64).not.toContain('3009876543');
    expect(encryptedBase64.length).toBeGreaterThan(100);

    // 2. Simula el Backend descifrando
    const decrypted = decryptE2EPayload<{ cedula: string; contacto: string }>(encryptedBase64);

    expect(decrypted).toEqual(originalPII);
    expect(decrypted.cedula).toBe('1102345678');
  });

  it('debe lanzar error de seguridad al intentar desencriptar un payload corrupto o interceptado', () => {
    const corruptedPayload = 'TG9yZW0gSXBzdW0gRG9sb3IgU2l0IEFtZXQ='; // "Lorem Ipsum..." en base64
    expect(() => decryptE2EPayload(corruptedPayload)).toThrow();
  });

  it('debe proteger el sistema si la llave pública no está aprovisionada (Frontend)', async () => {
    vi.stubEnv('NEXT_PUBLIC_RSA_KEY', '');
    await expect(encryptE2EPayload({ fallback: true })).rejects.toThrow(/NEXT_PUBLIC_RSA_KEY/);
    // Restaurar llave para próximas pruebas locales
    vi.stubEnv('NEXT_PUBLIC_RSA_KEY', tempPublicKey);
  });

  it('debe proteger el sistema si la llave privada no está aprovisionada (Backend)', () => {
    vi.stubEnv('RSA_PRIVATE_KEY', '');
    expect(() => decryptE2EPayload('dummy_base64_string')).toThrow(/RSA_PRIVATE_KEY/);
    vi.stubEnv('RSA_PRIVATE_KEY', tempPrivateKey);
  });

  it('no debe permitir desencriptación con un par de llaves RSA distinto (MitM Protection)', async () => {
    const originalPII = { secreto: 'CONFIDENCIAL' };
    const encryptedBase64 = await encryptE2EPayload(originalPII);

    // Generar un SEGUNDO par de llaves (Hacker)
    const { privateKey: hackerPrivateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    vi.stubEnv('RSA_PRIVATE_KEY', hackerPrivateKey);

    // El backend intentará desencriptar la data legítima con la llave equivocada
    expect(() => decryptE2EPayload(encryptedBase64)).toThrow();
  });
});
