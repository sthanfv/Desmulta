/**
 * Test de Integración — Galería de Casos de Éxito (api/gallery/route.ts)
 * Desmulta v8.11.0
 *
 * Valida el flujo completo del CRUD de casos de éxito mediante la API REST:
 * 1. POST /api/gallery: aplica marca de agua, sube a Blob y guarda en Firestore.
 * 2. GET /api/gallery: obtiene los casos públicos de Firestore con cache headers.
 * 3. DELETE /api/gallery: elimina de Firestore y de Blob.
 *
 * NOTA: Este test usa mocks completos del Admin SDK, Vercel Blob y JWT.
 * NO requiere emulador de Firebase — es un test de lógica de negocio puro.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks de Infraestructura (vi.hoisted garantiza inicialización antes del import) ───

const {
  mockAdd,
  mockDelete,
  mockDocGet,
  mockDoc,
  mockGetDocs,
  mockLimit,
  mockOrderBy,
  mockCollection,
  mockGetFirestore,
  mockPut,
  mockDel,
  mockVerifyIdToken,
  mockCheckRateLimit,
} = vi.hoisted(() => {
  const mockAdd = vi.fn().mockResolvedValue({ id: 'nuevo-id-generado' });
  const mockDelete = vi.fn().mockResolvedValue(undefined);
  const mockDocGet = vi.fn().mockResolvedValue({ exists: true, data: () => ({}) });
  const mockDoc = vi.fn().mockReturnValue({ delete: mockDelete, get: mockDocGet });

  const mockGetDocs = vi.fn().mockResolvedValue({
    docs: [
      {
        id: 'caso-1',
        data: () => ({ title: 'Caso 1', createdAt: '2026-06-01T00:00:00.000Z' }),
      },
    ],
  });

  const mockLimit = vi.fn().mockReturnValue({ get: mockGetDocs });
  const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });

  const mockCollection = vi.fn().mockImplementation((name) => {
    if (name === 'success_cases') {
      return { add: mockAdd, doc: mockDoc, orderBy: mockOrderBy };
    }
    return { add: mockAdd, doc: mockDoc };
  });

  const mockGetFirestore = vi.fn().mockReturnValue({ collection: mockCollection });
  const mockPut = vi.fn();
  const mockDel = vi.fn().mockResolvedValue(undefined);
  const mockVerifyIdToken = vi.fn().mockResolvedValue({ uid: 'mock-admin-uid' });
  const mockCheckRateLimit = vi.fn().mockResolvedValue({ success: true });

  return {
    mockAdd,
    mockDelete,
    mockDocGet,
    mockDoc,
    mockGetDocs,
    mockLimit,
    mockOrderBy,
    mockCollection,
    mockGetFirestore,
    mockPut,
    mockDel,
    mockVerifyIdToken,
    mockCheckRateLimit,
  };
});

// ─── Registro de Módulos Mockeados ────────────────────────────────────────────

vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: mockGetFirestore,
}));

vi.mock('@/lib/firebase-admin', () => ({
  getAdminApp: vi.fn().mockReturnValue({}),
}));

vi.mock('@vercel/blob', () => ({
  put: mockPut,
  del: mockDel,
}));

vi.mock('@/lib/image-watermark', () => ({
  applyWatermark: vi.fn().mockImplementation((buffer) => Promise.resolve({
    buffer,
    format: 'webp',
  })),
  fileToBuffer: vi.fn().mockImplementation((file) => Promise.resolve(Buffer.from('fake-buffer'))),
  buildWatermarkedFilename: vi.fn().mockImplementation((name, format) => `mocked-${name}.${format}`),
}));

// Mock de logger para evitar ruido en los tests
vi.mock('@/lib/logger/security-logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: mockCheckRateLimit,
}));

// ─── Importar después de los mocks ────────────────────────────────────────────

import { POST, GET, DELETE } from '@/app/api/gallery/route';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TOKEN_DUMMY = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';

function crearFormDataValido(): FormData {
  const form = new FormData();
  form.append('title', 'Caso de Prueba Bogotá');

  const beforeFile = new File(['fake-image-data-before'], 'antes.webp', { type: 'image/webp' });
  const afterFile = new File(['fake-image-data-after'], 'despues.webp', { type: 'image/webp' });

  form.append('beforeImage', beforeFile);
  form.append('afterImage', afterFile);

  return form;
}

/**
 * Helper para construir un NextRequest sintético para POST que esquiva errores de validación de FormData en el constructor.
 */
function crearRequestPost(headers?: Record<string, string>, formData = crearFormDataValido()): NextRequest {
  const req = new NextRequest('http://localhost/api/gallery', {
    method: 'POST',
    headers,
  });
  req.formData = vi.fn().mockResolvedValue(formData);
  return req;
}

// ─── Suite de Tests ────────────────────────────────────────────────────────────

describe('Gallery API Route — Integración CRUD de Casos de Éxito', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockPut
      .mockResolvedValueOnce({ url: 'https://blob.vercel-storage.com/test-antes.webp' })
      .mockResolvedValueOnce({ url: 'https://blob.vercel-storage.com/test-despues.webp' });

    mockDocGet.mockResolvedValue({ exists: true, data: () => ({}) });
    mockVerifyIdToken.mockResolvedValue({ uid: 'mock-admin-uid' });
    mockCheckRateLimit.mockResolvedValue({ success: true });
  });

  // ─── POST ──────────────────────────────────────────────────────────

  describe('POST /api/gallery', () => {
    it('debe retornar status 201 y { success: true } cuando todos los datos son válidos', async () => {
      const req = crearRequestPost({ Authorization: TOKEN_DUMMY });

      const response = await POST(req);
      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ success: true, id: 'nuevo-id-generado' });
    });

    it('debe retornar 401 si no se envía cabecera de autorización', async () => {
      const req = crearRequestPost();

      const response = await POST(req);
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: 'No autorizado' });
    });

    it('debe retornar 403 si el usuario no tiene permisos de administrador', async () => {
      mockDocGet.mockResolvedValueOnce({ exists: false });

      const req = crearRequestPost({ Authorization: TOKEN_DUMMY });

      const response = await POST(req);
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: 'Acceso denegado: No eres administrador.' });
    });

    it('debe subir 2 archivos a Vercel Blob (antes y después) con marca de agua', async () => {
      const req = crearRequestPost({ Authorization: TOKEN_DUMMY });

      await POST(req);

      expect(mockPut).toHaveBeenCalledTimes(2);
      expect(mockPut.mock.calls[0][0]).toContain('antes');
      expect(mockPut.mock.calls[1][0]).toContain('despues');
    });

    it('debe guardar el caso en la colección success_cases de Firestore', async () => {
      const req = crearRequestPost({ Authorization: TOKEN_DUMMY });

      await POST(req);

      expect(mockCollection).toHaveBeenCalledWith('success_cases');
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Caso de Prueba Bogotá',
          beforeImageUrl: 'https://blob.vercel-storage.com/test-antes.webp',
          afterImageUrl: 'https://blob.vercel-storage.com/test-despues.webp',
        })
      );
    });

    it('debe retornar error 400 cuando falta algún campo obligatorio', async () => {
      const form = new FormData();
      form.append('beforeImage', new File(['x'], 'a.webp', { type: 'image/webp' }));
      form.append('afterImage', new File(['x'], 'b.webp', { type: 'image/webp' }));

      const req = crearRequestPost({ Authorization: TOKEN_DUMMY }, form);

      const response = await POST(req);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: 'Faltan campos obligatorios (title, beforeImage, afterImage).',
      });
    });

    it('debe retornar error 400 cuando una imagen supera los 5MB', async () => {
      const form = new FormData();
      form.append('title', 'Caso de prueba');
      const imagenGrande = new File([new ArrayBuffer(6 * 1024 * 1024)], 'grande.webp', {
        type: 'image/webp',
      });
      form.append('beforeImage', imagenGrande);
      form.append('afterImage', new File(['x'], 'b.webp', { type: 'image/webp' }));

      const req = crearRequestPost({ Authorization: TOKEN_DUMMY }, form);

      const response = await POST(req);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: 'Las imágenes no pueden superar los 5MB.',
      });
    });

    it('debe capturar errores y retornar 500 si falla el Blob Storage', async () => {
      mockPut.mockReset();
      mockPut.mockRejectedValue(new Error('Blob storage no disponible'));

      const req = crearRequestPost({ Authorization: TOKEN_DUMMY });

      const response = await POST(req);
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: 'Error interno del servidor' });
    });

    it('debe retornar status 429 cuando se excede el rate limit en POST', async () => {
      mockCheckRateLimit.mockResolvedValueOnce({ success: false });
      const req = crearRequestPost({ Authorization: TOKEN_DUMMY });
      const response = await POST(req);
      expect(response.status).toBe(429);
      expect(await response.json()).toEqual({
        error: 'Demasiadas solicitudes de subida. Por favor, intente de nuevo más tarde.',
      });
    });
  });

  // ─── GET ───────────────────────────────────────────────────────────

  describe('GET /api/gallery', () => {
    it('debe retornar status 200 y la lista de casos públicos', async () => {
      const response = await GET();
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('cases');
      expect(data.cases).toHaveLength(1);
      expect(data.cases[0]).toEqual({
        id: 'caso-1',
        title: 'Caso 1',
        createdAt: '2026-06-01T00:00:00.000Z',
      });
    });

    it('debe incluir los headers de Cache-Control configurados', async () => {
      const response = await GET();
      expect(response.headers.get('Cache-Control')).toBe(
        'public, s-maxage=300, stale-while-revalidate=600'
      );
    });

    it('debe retornar status 500 si ocurre un error en Firestore', async () => {
      mockGetDocs.mockRejectedValueOnce(new Error('Firestore caído'));

      const response = await GET();
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: 'Error interno del servidor',
        cases: [],
      });
    });
  });

  // ─── DELETE ────────────────────────────────────────────────────────

  describe('DELETE /api/gallery', () => {
    const CASO_ID = 'caso-firestore-abc123';
    const BEFORE_URL = 'https://blob.vercel-storage.com/antes-abc.webp';
    const AFTER_URL = 'https://blob.vercel-storage.com/despues-abc.webp';

    it('debe retornar status 200 y { success: true } al eliminar correctamente', async () => {
      const req = new NextRequest('http://localhost/api/gallery', {
        method: 'DELETE',
        headers: { Authorization: TOKEN_DUMMY },
        body: JSON.stringify({ id: CASO_ID, beforeImageUrl: BEFORE_URL, afterImageUrl: AFTER_URL }),
      });

      const response = await DELETE(req);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ success: true });
    });

    it('debe retornar 401 si no se envía cabecera de autorización', async () => {
      const req = new NextRequest('http://localhost/api/gallery', {
        method: 'DELETE',
        body: JSON.stringify({ id: CASO_ID, beforeImageUrl: BEFORE_URL, afterImageUrl: AFTER_URL }),
      });

      const response = await DELETE(req);
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: 'No autorizado' });
    });

    it('debe retornar 403 si el usuario no tiene permisos de administrador', async () => {
      mockDocGet.mockResolvedValueOnce({ exists: false });

      const req = new NextRequest('http://localhost/api/gallery', {
        method: 'DELETE',
        headers: { Authorization: TOKEN_DUMMY },
        body: JSON.stringify({ id: CASO_ID, beforeImageUrl: BEFORE_URL, afterImageUrl: AFTER_URL }),
      });

      const response = await DELETE(req);
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: 'Acceso denegado.' });
    });

    it('debe eliminar ambas imágenes de Vercel Blob', async () => {
      const req = new NextRequest('http://localhost/api/gallery', {
        method: 'DELETE',
        headers: { Authorization: TOKEN_DUMMY },
        body: JSON.stringify({ id: CASO_ID, beforeImageUrl: BEFORE_URL, afterImageUrl: AFTER_URL }),
      });

      await DELETE(req);
      expect(mockDel).toHaveBeenCalledWith([BEFORE_URL, AFTER_URL]);
    });

    it('debe eliminar el documento de Firestore por ID', async () => {
      const req = new NextRequest('http://localhost/api/gallery', {
        method: 'DELETE',
        headers: { Authorization: TOKEN_DUMMY },
        body: JSON.stringify({ id: CASO_ID, beforeImageUrl: BEFORE_URL, afterImageUrl: AFTER_URL }),
      });

      await DELETE(req);
      expect(mockDoc).toHaveBeenCalledWith(CASO_ID);
      expect(mockDelete).toHaveBeenCalled();
    });

    it('debe retornar 400 si faltan parámetros obligatorios en el body', async () => {
      const req = new NextRequest('http://localhost/api/gallery', {
        method: 'DELETE',
        headers: { Authorization: TOKEN_DUMMY },
        body: JSON.stringify({ id: CASO_ID }), // falta beforeImageUrl y afterImageUrl
      });

      const response = await DELETE(req);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: 'Faltan parámetros (id, beforeImageUrl, afterImageUrl).',
      });
    });

    it('debe retornar status 500 si falla Firestore al eliminar', async () => {
      mockDelete.mockRejectedValueOnce(new Error('Error de base de datos'));

      const req = new NextRequest('http://localhost/api/gallery', {
        method: 'DELETE',
        headers: { Authorization: TOKEN_DUMMY },
        body: JSON.stringify({ id: CASO_ID, beforeImageUrl: BEFORE_URL, afterImageUrl: AFTER_URL }),
      });

      const response = await DELETE(req);
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: 'Error interno del servidor' });
    });

    it('debe retornar status 429 cuando se excede el rate limit en DELETE', async () => {
      mockCheckRateLimit.mockResolvedValueOnce({ success: false });
      const req = new NextRequest('http://localhost/api/gallery', {
        method: 'DELETE',
        headers: { Authorization: TOKEN_DUMMY },
        body: JSON.stringify({ id: CASO_ID, beforeImageUrl: BEFORE_URL, afterImageUrl: AFTER_URL }),
      });
      const response = await DELETE(req);
      expect(response.status).toBe(429);
      expect(await response.json()).toEqual({
        error: 'Demasiadas solicitudes de eliminación. Por favor, intente de nuevo más tarde.',
      });
    });
  });
});
