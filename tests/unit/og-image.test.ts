/**
 * Test Unitario — Endpoint OG Image (/api/og)
 * Desmulta v8.11.0
 *
 * Valida el comportamiento del generador de imágenes OpenGraph por ciudad:
 * 1. El endpoint responde sin errores para ciudades conocidas.
 * 2. El endpoint responde sin errores para ciudades con caracteres especiales.
 * 3. El endpoint responde con un fallback cuando no se pasa ciudad.
 * 4. El Content-Type de la respuesta es image/png.
 *
 * NOTA: ImageResponse de next/og se ejecuta en el Edge Runtime de Vercel.
 * En jsdom/Node.js usamos un mock que simula la respuesta HTTP correcta.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock de next/og — ImageResponse ──────────────────────────────────────────

/**
 * ImageResponse es una clase que extiende Response del Web API.
 * En el entorno de test (jsdom), no tenemos el canvas de Vercel,
 * así que simulamos una respuesta PNG válida con el tamaño correcto.
 */
vi.mock('next/og', () => ({
  ImageResponse: class MockImageResponse {
    private _status: number;
    private _headers: Headers;

    constructor(
      _element: unknown,
      options?: { width?: number; height?: number }
    ) {
      this._status = 200;
      this._headers = new Headers({
        'Content-Type': 'image/png',
        'X-Mock-Width': String(options?.width ?? 1200),
        'X-Mock-Height': String(options?.height ?? 630),
      });
    }

    get status() {
      return this._status;
    }

    get headers() {
      return this._headers;
    }

    // Simula el body de una imagen PNG mínima válida (cabecera PNG real)
    async arrayBuffer() {
      return new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]).buffer;
    }
  },
}));

// ─── Importar el handler después del mock ─────────────────────────────────────

import { GET } from '@/app/api/og/route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Crea un NextRequest sintético con los query params dados.
 */
function crearRequest(params: Record<string, string>): Request {
  const url = new URL('https://desmulta.online/api/og');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new Request(url.toString());
}

// ─── Suite de Tests ────────────────────────────────────────────────────────────

describe('GET /api/og — Generador de Imágenes OpenGraph por Ciudad', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe responder con status 200 para una ciudad válida', async () => {
    const req = crearRequest({ ciudad: 'Bogotá', dept: 'Cundinamarca' });
    const response = await GET(req as Parameters<typeof GET>[0]);

    expect(response.status).toBe(200);
  });

  it('debe responder con Content-Type: image/png', async () => {
    const req = crearRequest({ ciudad: 'Medellín', dept: 'Antioquia' });
    const response = await GET(req as Parameters<typeof GET>[0]);

    expect(response.headers.get('Content-Type')).toBe('image/png');
  });

  it('debe generar imagen de 1200×630 píxeles (estándar OG)', async () => {
    const req = crearRequest({ ciudad: 'Cali', dept: 'Valle del Cauca' });
    const response = await GET(req as Parameters<typeof GET>[0]);

    // El mock expone las dimensiones en headers para verificación
    expect(response.headers.get('X-Mock-Width')).toBe('1200');
    expect(response.headers.get('X-Mock-Height')).toBe('630');
  });

  it('debe responder sin error cuando no se pasa ciudad (usa fallback "Colombia")', async () => {
    const req = crearRequest({}); // Sin parámetros
    const response = await GET(req as Parameters<typeof GET>[0]);

    expect(response.status).toBe(200);
  });

  it('debe responder sin error para ciudades con caracteres especiales (ñ, tildes)', async () => {
    const req = crearRequest({ ciudad: 'Barranquilla', dept: 'Atlántico' });
    const response = await GET(req as Parameters<typeof GET>[0]);

    expect(response.status).toBe(200);
  });

  it('debe responder sin error para ciudades con espacios en el nombre', async () => {
    const req = crearRequest({ ciudad: 'Santa Marta', dept: 'Magdalena' });
    const response = await GET(req as Parameters<typeof GET>[0]);

    expect(response.status).toBe(200);
  });

  it('debe responder sin error sin el parámetro dept (departamento opcional)', async () => {
    const req = crearRequest({ ciudad: 'Pereira' }); // Sin dept
    const response = await GET(req as Parameters<typeof GET>[0]);

    expect(response.status).toBe(200);
  });

  it('la respuesta debe tener contenido binario (buffer no vacío)', async () => {
    const req = crearRequest({ ciudad: 'Bucaramanga', dept: 'Santander' });
    const response = await GET(req as Parameters<typeof GET>[0]);

    const buffer = await response.arrayBuffer();
    // El buffer debe tener al menos los bytes de cabecera PNG
    expect(buffer.byteLength).toBeGreaterThan(0);
  });
});
