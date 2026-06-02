import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSIMITValidator, type ResultadoOCR } from '../hooks/useSIMITValidator';
import { tesseractManager } from '../lib/ocr/tesseract-worker';

// Mock de infraestructura Firebase (evita fallos de fetch/auth en tests)
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
  getApp: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));

// Mock de store de expedientes
vi.mock('@/store/useExpedienteStore', () => ({
  useExpedienteStore: vi.fn(() => ({
    agregarMulta: vi.fn(),
    multas: [],
  })),
}));

// Mock de tesseractManager para evitar carga de WASM en tests
vi.mock('@/lib/ocr/tesseract-worker', () => ({
  tesseractManager: {
    init: vi.fn(),
    recognize: vi.fn(),
    terminate: vi.fn(),
  },
}));

// Mock de optimizador de imágenes
vi.mock('@/lib/optimizador-imagenes', () => ({
  comprimirCaptura: vi.fn((file) => Promise.resolve(file)),
}));

// Mock de telemetría
vi.mock('@/lib/logger/media-logger', () => ({
  mediaLogger: {
    log: vi.fn(),
    getDeviceInfo: vi.fn(() => ({})),
    getLogs: vi.fn(() => []),
  },
}));

describe('useSIMITValidator: Motor OCR y Resiliencia (v7.4.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockFile = new File([''], 'test.png', { type: 'image/png' });

  it('✅ Debe ACEPTAR una imagen con al menos 3 tokens válidos (SIMIT, ESTADO, CUENTA)', async () => {
    const mockOcrTextValido =
      'REPUBLICA DE COLOMBIA - SIMIT - ESTADO DE CUENTA - INFRACCION DE TRANSITO';

    vi.mocked(tesseractManager.recognize).mockResolvedValue({
      data: {
        text: mockOcrTextValido,
        words: [
          { text: 'SIMIT', confidence: 90, bbox: { x0: 0, y0: 0, x1: 10, y1: 10 } },
          { text: 'ESTADO', confidence: 90, bbox: { x0: 10, y0: 0, x1: 20, y1: 10 } },
          { text: 'CUENTA', confidence: 90, bbox: { x0: 20, y0: 0, x1: 30, y1: 10 } },
        ],
      },
    });

    const { result } = renderHook(() => useSIMITValidator());

    let response: ResultadoOCR | undefined;
    await act(async () => {
      response = await result.current.validarImagenSIMIT(mockFile);
    });

    expect(response?.esValida).toBe(true);
    expect(response?.coincidencias.length).toBeGreaterThanOrEqual(3);
    expect(response?.coincidencias).toContain('SIMIT');
    expect(response?.coincidencias).toContain('ESTADO');
    expect(response?.coincidencias).toContain('CUENTA');
  });

  it('❌ Debe RECHAZAR imagen sin tokens SIMIT válidos (Fail-Closed: esValida DEBE ser false)', async () => {
    const mockOcrTextInvalido = 'Esta es una imagen de un paisaje con montañas y un lago.';

    vi.mocked(tesseractManager.recognize).mockResolvedValue({
      data: {
        text: mockOcrTextInvalido,
        words: [{ text: 'Recibo', confidence: 90, bbox: { x0: 0, y0: 0, x1: 10, y1: 10 } }],
      },
    });

    const { result } = renderHook(() => useSIMITValidator());

    let response: ResultadoOCR | undefined;
    await act(async () => {
      response = await result.current.validarImagenSIMIT(mockFile);
    });

    // ASSERT CRÍTICO: esValida debe ser FALSE cuando no hay tokens suficientes.
    // Este es el único assert que protege la regresión al comportamiento Fail-Open.
    expect(response?.esValida).toBe(false);
    expect(response?.coincidencias).toHaveLength(0);
  });

  it('🛡️ Debe ser resiliente a ruidos y normalizar correctamente (MAYÚSCULAS/Unicode)', async () => {
    const mockOcrTextRuido = 'Símít... éstádó de cuêntâ... ínfráccíón de tránsítö!!!'; // Con tildes y caracteres extra

    vi.mocked(tesseractManager.recognize).mockResolvedValue({
      data: {
        text: mockOcrTextRuido,
        words: [],
      },
    });

    const { result } = renderHook(() => useSIMITValidator());

    let response: ResultadoOCR | undefined;
    await act(async () => {
      response = await result.current.validarImagenSIMIT(mockFile);
    });

    expect(response?.coincidencias).toContain('SIMIT');
    expect(response?.coincidencias).toContain('ESTADO');
    expect(response?.coincidencias).toContain('CUENTA');
  });
});
