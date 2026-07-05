/**
 * pushService.ts — Web Push Subscription Manager
 *
 * Cambios vs versión anterior:
 * - Ya no devuelve `null` silenciosamente en errores reales.
 * - Entorno no compatible (Safari/iOS) sigue devolviendo null — es esperado, no es error.
 * - Errores reales se relanza para que el caller pueda decidir qué hacer.
 * - Logging solo en desarrollo para no exponer detalles de configuración.
 */
import { SecurityLogger } from '@/lib/logger/security-logger';

/**
 * Inicializa y gestiona la suscripción a notificaciones Web Push.
 *
 * @param publicVapidKey - Llave pública VAPID
 * @returns Suscripción existente o nueva, null si el entorno no es compatible
 * @throws Error si el entorno ES compatible pero la suscripción falla
 */
export async function subscribeToPushNotifications(
  publicVapidKey: string
): Promise<PushSubscription | null> {
  // Entorno no compatible — es esperado en muchos dispositivos. No es error.
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window)
  ) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const existingSubscription = await registration.pushManager.getSubscription();

    if (existingSubscription) return existingSubscription;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: publicVapidKey,
    });

    return subscription;
  } catch (error) {
    // En producción Sentry lo captura vía SecurityLogger
    SecurityLogger.error('[pushService] Error en negociación de PushSubscription', {
      error: error instanceof Error ? error.message : String(error),
    });

    // IMPORTANTE: Relanzamos para que el caller sepa que hubo un fallo real.
    // Antes devolvíamos null aquí y el caller pensaba que todo estaba bien.
    throw error;
  }
}
