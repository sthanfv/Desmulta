import { toast } from 'sonner';
import { SecurityLogger } from '@/lib/logger/security-logger';

/**
 * Controlador centralizado de notificaciones In-App (MANDATO-FILTRO v5.4.5).
 * Previene la exposición accidental de Stack Traces o PII en la interfaz de usuario.
 * Arquitectura DevSecOps: Sanitización visual obligatoria.
 */
export const Feedback = {
  /**
   * Notificación de éxito para hitos del usuario.
   */
  success: (title: string, description?: string) => {
    toast.success(title, { description });
  },

  /**
   * Notificación de error controlada.
   * Filtra el error técnico (rawError) hacia la consola/Sentry,
   * pero muestra un mensaje genérico y seguro al usuario.
   */
  error: (title: string, rawError?: unknown) => {
    // DevSecOps: El error real solo viaja a logs internos (y Sentry vía instrumentation)
    SecurityLogger.error('[Feedback] Error de usuario capturado', {
      error: rawError instanceof Error ? rawError.message : String(rawError),
    });

    toast.error(title, {
      description:
        'Si el problema persiste, nuestro equipo técnico ya ha sido notificado automáticamente.',
    });
  },

  /**
   * Advertencias operativas.
   */
  warning: (title: string, description?: string) => {
    toast.warning(title, { description });
  },

  /**
   * Acción de sistema con callback interactivo.
   * Útil para reintentos o navegación rápida.
   */
  systemAction: (title: string, actionLabel: string, onClick: () => void) => {
    toast(title, {
      action: {
        label: actionLabel,
        onClick: onClick,
      },
    });
  },
};
