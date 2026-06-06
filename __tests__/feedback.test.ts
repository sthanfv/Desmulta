import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Feedback } from '@/lib/ui/feedback';
import { toast } from 'sonner';

// Mock estricto de la librería de UI para evitar dependencias de renderizado
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

describe('QA DevSecOps: Controlador Central de Feedback (In-App Toasts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suprimir logs de consola esperados durante los tests de error
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('debe renderizar notificaciones de éxito correctamente', () => {
    Feedback.success('Proceso completado', 'El UUID fue generado.');
    expect(toast.success).toHaveBeenCalledWith('Proceso completado', {
      description: 'El UUID fue generado.',
    });
  });

  it('CRÍTICO: debe interceptar errores crudos (Zero-PII) y renderizar un mensaje sanitizado', () => {
    const rawDatabaseError = { code: 500, query: 'SELECT * FROM users', secret: 'PII_DATA' };

    Feedback.error('Fallo en la consulta', rawDatabaseError);

    // 1. Verifica que el error crudo se registre en el servidor (para telemetría interna)
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('[ERROR] [Feedback] Error de usuario capturado:'),
      expect.stringContaining('[object Object]')
    );

    // 2. Verifica que el cliente (toast) reciba estrictamente el mensaje sanitizado, NUNCA el error crudo
    expect(toast.error).toHaveBeenCalledWith('Fallo en la consulta', {
      description:
        'Si el problema persiste, nuestro equipo técnico ya ha sido notificado automáticamente.',
    });

    // 3. Afirmación explícita de seguridad: la librería de UI no debe recibir los datos sensibles
    expect(toast.error).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ description: rawDatabaseError })
    );
  });
});
