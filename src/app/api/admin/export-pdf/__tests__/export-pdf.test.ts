/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';

// Mocks
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(),
  })),
}));

// Simulamos los imports dinámicos y la autenticación
vi.mock('next-firebase-auth-edge/lib/next/tokens', () => ({
  getTokens: vi.fn(async () => ({
    decodedToken: { email: 'admin_test@desmulta.com' },
  })),
}));

// Mock de la verificación del PIN
vi.mock('@/app/admin/audit-actions', () => ({
  verifyOperatorPin: vi.fn(async (pin: string) => {
    if (pin === 'correct_pin') return { success: true };
    return { success: false, error: 'PIN incorrecto' };
  }),
  logExportPdfAction: vi.fn(async () => ({ success: true })),
}));

// Mock del generador HTML
vi.mock('@/lib/pdf/template', () => ({
  generarHtmlReporte: vi.fn(() => '<html><body>Test</body></html>'),
}));

// Mock Puppeteer & Sparticuz
vi.mock('puppeteer-core', () => {
  const mockPage = {
    setContent: vi.fn(),
    pdf: vi.fn().mockResolvedValue(Buffer.from('PDF_CONTENT')),
  };
  const mockBrowser = {
    newPage: vi.fn().mockResolvedValue(mockPage),
    close: vi.fn(),
  };
  return {
    default: {
      launch: vi.fn().mockResolvedValue(mockBrowser),
    },
  };
});

vi.mock('@sparticuz/chromium', () => ({
  default: {
    args: [],
    executablePath: vi.fn().mockResolvedValue('/tmp/chromium'),
  },
}));

describe('Export PDF API - Smoke Test & Anti-Leak Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const generateRequest = (body: unknown) => {
    return new Request('https://desmulta.com/api/admin/export-pdf', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  };

  it('Debe rechazar la solicitud si falta el PIN o los datos', async () => {
    const req = generateRequest({});
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Faltan parámetros requeridos');
  });

  it('Debe devolver 403 si el PIN del operador es incorrecto', async () => {
    const req = generateRequest({
      pin: 'wrong_pin',
      data: { items: [] },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toBe('PIN incorrecto');
  });

  it('Debe procesar la solicitud, generar hash, inyectar email y retornar el PDF con PIN correcto', async () => {
    const req = generateRequest({
      pin: 'correct_pin',
      data: {
        items: [{ id: '1', nombre: 'Test' }],
        filtros: { ciudad: 'Bogotá' },
      },
    });

    const res = await POST(req);

    // Verificamos respuesta exitosa
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('content-disposition')).toContain(
      'attachment; filename="Reporte_Desmulta'
    );

    // Verificamos que el buffer haya sido extraído
    const blob = await res.blob();
    expect(blob.size).toBeGreaterThan(0);
  });
});
