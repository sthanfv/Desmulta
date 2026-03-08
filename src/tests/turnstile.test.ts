/**
 * MANDATO-FILTRO — Tests unitarios: Verificación Turnstile Server-Side
 *
 * Cubre todos los escenarios de la función verifyTurnstileToken()
 * usando mocks de fetch para no depender de la API real de Cloudflare.
 *
 * Versión: 2.1.0 — Desmulta
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ────────────────────────────────────────────────────────────────────────────
// Re-implementación local de la lógica para tests unitarios puros.
// La función real vive en src/app/api/create-consultation/route.ts
// pero no se puede importar directamente (depende de módulos de servidor).
// Este archivo prueba la LÓGICA de la función en aislamiento total.
// ────────────────────────────────────────────────────────────────────────────

async function verifyTurnstileToken(
  token: string | undefined,
  secretKey: string | undefined,
  isProduction: boolean
): Promise<boolean> {
  if (!token) return false;

  if (!secretKey) {
    if (!isProduction) return true; // dev: fail-open con advertencia
    return false; // prod sin key: fail-closed
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    const data = (await res.json()) as { success: boolean; 'error-codes'?: string[] };
    return data.success;
  } catch {
    return false; // fail-closed ante error de red
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Suite de Tests
// ────────────────────────────────────────────────────────────────────────────

describe('🛡️ Verificación Turnstile Server-Side (MANDATO-FILTRO)', () => {
  const TOKEN_VALIDO = 'token-cloudflare-valido-simulado';
  const TOKEN_INVALIDO = 'token-falso-de-bot';
  const SECRET_KEY = 'secret-test-0x4AAAAAAA';

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── Escenario 1: Token ausente ─────────────────────────────────────────
  describe('🚫 Token ausente o inválido', () => {
    it('debe retornar FALSE con token undefined (sin llamar a Cloudflare)', async () => {
      const resultado = await verifyTurnstileToken(undefined, SECRET_KEY, true);
      expect(resultado).toBe(false);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('debe retornar FALSE con token cadena vacía', async () => {
      const resultado = await verifyTurnstileToken('', SECRET_KEY, true);
      expect(resultado).toBe(false);
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  // ── Escenario 2: Secret Key ausente ───────────────────────────────────
  describe('⚙️ Comportamiento sin TURNSTILE_SECRET_KEY', () => {
    it('en DESARROLLO (fail-open): debe retornar TRUE sin la secret key para no bloquear devs', async () => {
      const resultado = await verifyTurnstileToken(TOKEN_VALIDO, undefined, false);
      expect(resultado).toBe(true);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('en PRODUCCIÓN (fail-closed): debe retornar FALSE sin la secret key', async () => {
      const resultado = await verifyTurnstileToken(TOKEN_VALIDO, undefined, true);
      expect(resultado).toBe(false);
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  // ── Escenario 3: Cloudflare acepta el token ────────────────────────────
  describe('✅ Token válido aceptado por Cloudflare', () => {
    it('debe retornar TRUE cuando Cloudflare responde { success: true }', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        json: async () => ({ success: true }),
      } as Response);

      const resultado = await verifyTurnstileToken(TOKEN_VALIDO, SECRET_KEY, true);
      expect(resultado).toBe(true);
    });

    it('debe enviar el secret y el token en el body de la petición a Cloudflare', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        json: async () => ({ success: true }),
      } as Response);

      await verifyTurnstileToken(TOKEN_VALIDO, SECRET_KEY, true);

      expect(fetch).toHaveBeenCalledWith(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(`secret=${SECRET_KEY}`),
        })
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining(`response=${TOKEN_VALIDO}`),
        })
      );
    });
  });

  // ── Escenario 4: Cloudflare rechaza el token ──────────────────────────
  describe('🚫 Token rechazado por Cloudflare', () => {
    it('debe retornar FALSE cuando Cloudflare responde { success: false }', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        json: async () => ({
          success: false,
          'error-codes': ['invalid-input-response'],
        }),
      } as Response);

      const resultado = await verifyTurnstileToken(TOKEN_INVALIDO, SECRET_KEY, true);
      expect(resultado).toBe(false);
    });
  });

  // ── Escenario 5: Error de red ─────────────────────────────────────────
  describe('🔌 Tolerancia a fallos de red (fail-closed)', () => {
    it('debe retornar FALSE si la red falla (no fail-open), protegiendo el sistema', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network Error: ECONNREFUSED'));

      const resultado = await verifyTurnstileToken(TOKEN_VALIDO, SECRET_KEY, true);
      expect(resultado).toBe(false);
    });

    it('debe retornar FALSE si Cloudflare retorna un JSON malformado', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        json: async () => {
          throw new SyntaxError('Unexpected token');
        },
      } as unknown as Response);

      const resultado = await verifyTurnstileToken(TOKEN_VALIDO, SECRET_KEY, true);
      expect(resultado).toBe(false);
    });
  });
});
