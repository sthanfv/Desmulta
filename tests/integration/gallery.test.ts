/**
 * Test de Integración — Galería de Casos de Éxito (admin/gallery/actions.ts)
 * Desmulta v8.11.0
 *
 * Valida el flujo completo del CRUD de casos de éxito:
 * 1. addSuccessCase: guarda en Firestore, sube a Blob y llama revalidatePath en 3 rutas.
 * 2. deleteSuccessCase: elimina de Firestore, borra de Blob y llama revalidatePath en 3 rutas.
 *
 * NOTA: Este test usa mocks completos del Admin SDK y Vercel Blob.
 * NO requiere emulador de Firebase — es un test de lógica de negocio puro.
 * Para tests contra el emulador real, usar tests/integration/kanban.test.ts como referencia.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks de Infraestructura (vi.hoisted garantiza inicialización antes del import) ───

/**
 * vi.hoisted() es necesario porque Vitest eleva (hoist) los vi.mock() al tope
 * del archivo, antes de cualquier import. Sin hoisted(), las variables declaradas
 * con const/let no están inicializadas aún cuando el factory de vi.mock las referencia.
 */
const {
  mockAdd,
  mockDelete,
  mockDoc,
  mockCollection,
  mockGetFirestore,
  mockRevalidatePath,
  mockPut,
  mockDel,
} = vi.hoisted(() => {
  const mockAdd = vi.fn().mockResolvedValue({ id: 'nuevo-id-generado' });
  const mockDelete = vi.fn().mockResolvedValue(undefined);
  const mockDoc = vi.fn().mockReturnValue({ delete: mockDelete });
  const mockCollection = vi.fn().mockReturnValue({ add: mockAdd, doc: mockDoc });
  const mockGetFirestore = vi.fn().mockReturnValue({ collection: mockCollection });
  const mockRevalidatePath = vi.fn();
  const mockPut = vi.fn();
  const mockDel = vi.fn().mockResolvedValue(undefined);

  return { mockAdd, mockDelete, mockDoc, mockCollection, mockGetFirestore, mockRevalidatePath, mockPut, mockDel };
});

// ─── Registro de Módulos Mockeados ────────────────────────────────────────────

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: mockGetFirestore,
}));

vi.mock('@/lib/firebase-admin', () => ({
  getAdminApp: vi.fn().mockReturnValue({}),
}));

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}));

// Mock de requireAdminSession — siempre aprueba en tests
vi.mock('@/lib/auth/require-admin-session', () => ({
  requireAdminSession: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@vercel/blob', () => ({
  put: mockPut,
  del: mockDel,
}));

// Mock de image-watermark para evitar que sharp intente procesar los fake buffers de los tests
vi.mock('@/lib/image-watermark', () => ({
  applyWatermark: vi.fn().mockImplementation((buffer) => Promise.resolve({
    buffer,
    format: 'webp'
  })),
  fileToBuffer: vi.fn().mockImplementation((file) => Promise.resolve(Buffer.from('fake-buffer'))),
  buildWatermarkedFilename: vi.fn().mockImplementation((name, format) => `mocked-${name}.${format}`)
}));

// ─── Importar después de los mocks ────────────────────────────────────────────

import { addSuccessCase, deleteSuccessCase } from '@/app/admin/gallery/actions';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TOKEN_DUMMY = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';

/**
 * Crea un FormData con los campos mínimos requeridos por addSuccessCase.
 */
function crearFormDataValido(): FormData {
  const form = new FormData();
  form.append('title', 'Caso de Prueba Bogotá');

  // Simular archivos de imagen válidos (<5MB)
  const beforeFile = new File(['fake-image-data-before'], 'antes.webp', { type: 'image/webp' });
  const afterFile = new File(['fake-image-data-after'], 'despues.webp', { type: 'image/webp' });

  form.append('beforeImage', beforeFile);
  form.append('afterImage', afterFile);

  return form;
}

// ─── Suite de Tests ────────────────────────────────────────────────────────────

describe('Gallery Actions — Integración CRUD de Casos de Éxito', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Vercel Blob siempre retorna una URL pública simulada
    mockPut
      .mockResolvedValueOnce({ url: 'https://blob.vercel-storage.com/test-antes.webp' })
      .mockResolvedValueOnce({ url: 'https://blob.vercel-storage.com/test-despues.webp' });
  });

  // ─── addSuccessCase ──────────────────────────────────────────────────────────

  describe('addSuccessCase', () => {
    it('debe retornar { success: true } cuando todos los datos son válidos', async () => {
      const result = await addSuccessCase(TOKEN_DUMMY, crearFormDataValido());

      expect(result).toEqual({ success: true });
    });

    it('debe subir 2 archivos a Vercel Blob (antes y después)', async () => {
      await addSuccessCase(TOKEN_DUMMY, crearFormDataValido());

      expect(mockPut).toHaveBeenCalledTimes(2);
      // El primer put corresponde a la imagen "antes"
      expect(mockPut.mock.calls[0][0]).toContain('antes');
      // El segundo put corresponde a la imagen "después"
      expect(mockPut.mock.calls[1][0]).toContain('despues');
    });

    it('debe guardar el documento en la colección success_cases de Firestore', async () => {
      await addSuccessCase(TOKEN_DUMMY, crearFormDataValido());

      expect(mockCollection).toHaveBeenCalledWith('success_cases');
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Caso de Prueba Bogotá',
          beforeImageUrl: 'https://blob.vercel-storage.com/test-antes.webp',
          afterImageUrl: 'https://blob.vercel-storage.com/test-despues.webp',
        })
      );
    });

    it('debe llamar revalidatePath en exactamente 3 rutas (home, admin, ciudades)', async () => {
      await addSuccessCase(TOKEN_DUMMY, crearFormDataValido());

      expect(mockRevalidatePath).toHaveBeenCalledTimes(3);
      expect(mockRevalidatePath).toHaveBeenCalledWith('/');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/gallery');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/servicios', 'layout');
    });

    it('debe retornar error cuando falta el título', async () => {
      const form = new FormData();
      // Sin título — solo imágenes
      form.append('beforeImage', new File(['x'], 'a.webp', { type: 'image/webp' }));
      form.append('afterImage', new File(['x'], 'b.webp', { type: 'image/webp' }));

      const result = await addSuccessCase(TOKEN_DUMMY, form);

      expect(result).toEqual({ error: 'Faltan campos obligatorios' });
    });

    it('debe retornar error cuando una imagen supera los 5MB', async () => {
      const form = new FormData();
      form.append('title', 'Caso con imagen enorme');
      // Imagen que supera el límite de 5MB
      const imagenGrande = new File([new ArrayBuffer(6 * 1024 * 1024)], 'grande.webp', {
        type: 'image/webp',
      });
      form.append('beforeImage', imagenGrande);
      form.append('afterImage', new File(['x'], 'b.webp', { type: 'image/webp' }));

      const result = await addSuccessCase(TOKEN_DUMMY, form);

      expect(result).toEqual({ error: 'Las imágenes no pueden superar los 5MB' });
    });

    it('debe capturar errores del Blob y retornar { error } apropiado', async () => {
      // Limpiamos las resoluciones configuradas en beforeEach y forzamos el rechazo
      mockPut.mockReset();
      mockPut.mockRejectedValueOnce(new Error('Blob storage no disponible'));

      const result = await addSuccessCase(TOKEN_DUMMY, crearFormDataValido());

      expect(result).toHaveProperty('error');
      expect(result.error).toContain('Blob storage no disponible');
    });
  });

  // ─── deleteSuccessCase ───────────────────────────────────────────────────────

  describe('deleteSuccessCase', () => {
    const CASO_ID = 'caso-firestore-abc123';
    const BEFORE_URL = 'https://blob.vercel-storage.com/antes-abc.webp';
    const AFTER_URL = 'https://blob.vercel-storage.com/despues-abc.webp';

    it('debe retornar { success: true } cuando el caso existe', async () => {
      const result = await deleteSuccessCase(TOKEN_DUMMY, CASO_ID, BEFORE_URL, AFTER_URL);

      expect(result).toEqual({ success: true });
    });

    it('debe eliminar ambas imágenes de Vercel Blob', async () => {
      await deleteSuccessCase(TOKEN_DUMMY, CASO_ID, BEFORE_URL, AFTER_URL);

      expect(mockDel).toHaveBeenCalledWith([BEFORE_URL, AFTER_URL]);
    });

    it('debe eliminar el documento de Firestore por ID', async () => {
      await deleteSuccessCase(TOKEN_DUMMY, CASO_ID, BEFORE_URL, AFTER_URL);

      expect(mockDoc).toHaveBeenCalledWith(CASO_ID);
      expect(mockDelete).toHaveBeenCalled();
    });

    it('debe llamar revalidatePath en exactamente 3 rutas (home, admin, ciudades)', async () => {
      await deleteSuccessCase(TOKEN_DUMMY, CASO_ID, BEFORE_URL, AFTER_URL);

      expect(mockRevalidatePath).toHaveBeenCalledTimes(3);
      expect(mockRevalidatePath).toHaveBeenCalledWith('/');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/gallery');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/servicios', 'layout');
    });

    it('debe capturar errores de Firestore y retornar { error } apropiado', async () => {
      mockDelete.mockRejectedValueOnce(new Error('Firestore: permisos insuficientes'));

      const result = await deleteSuccessCase(TOKEN_DUMMY, CASO_ID, BEFORE_URL, AFTER_URL);

      expect(result).toHaveProperty('error');
      expect(result.error).toContain('Firestore');
    });
  });
});
