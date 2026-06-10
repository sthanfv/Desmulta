import { getMessaging } from 'firebase-admin/messaging';
import { logger } from '@/lib/logger/security-logger';

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
}

const formatId = (rawId: string) => rawId.replace(/^(CASE|LEAD)-/i, '');

export const STATUS_TEMPLATES: Record<string, (caseId: string, operatorNote?: string) => PushMessage> = {
  pendiente: (id, note) => ({
    title: '⏳ Solicitud Recibida',
    body: `Hemos recibido tu solicitud y pronto un asesor la revisará. Expediente: ${formatId(id)}${note ? `\n\n💬 Nota: ${note}` : ''}`,
  }),
  nuevo: (id, note) => ({
    title: '⏳ Solicitud Recibida',
    body: `Hemos recibido tu solicitud y pronto un asesor la revisará. Expediente: ${formatId(id)}${note ? `\n\n💬 Nota: ${note}` : ''}`,
  }),
  contactado: (id, note) => ({
    title: '📞 Contacto Establecido',
    body: `Hemos iniciado la comunicación para avanzar con el estudio de tu expediente ${formatId(id)}.${note ? `\n\n💬 Nota: ${note}` : ''}`,
  }),
  estudio: (id, note) => ({
    title: '🔍 En Estudio de Viabilidad',
    body: `Estamos analizando las pruebas y fundamentos legales para tu expediente ${formatId(id)}.${note ? `\n\n💬 Nota: ${note}` : ''}`,
  }),
  en_proceso: (id, note) => ({
    title: '⚙️ Expediente En Proceso',
    body: `Tu expediente ${formatId(id)} está siendo preparado por nuestro equipo legal.${note ? `\n\n💬 Nota: ${note}` : ''}`,
  }),
  documentacion: (id, note) => ({
    title: '📄 Solicitud de Documentos',
    body: `Necesitamos documentación adicional para avanzar con tu expediente ${formatId(id)}.${note ? `\n\n💬 Nota: ${note}` : ''}`,
  }),
  apertura: (id, note) => ({
    title: '🟢 Expediente Iniciado',
    body: `Tu expediente ${formatId(id)} ha sido aceptado y ya está formalmente abierto en el sistema.${note ? `\n\n💬 Nota: ${note}` : ''}`,
  }),
  radicado: (id, note) => ({
    title: '✉️ Documento Radicado',
    body: `Hemos radicado legalmente la petición para tu expediente ${formatId(id)}. Te informaremos apenas haya respuesta.${note ? `\n\n💬 Nota: ${note}` : ''}`,
  }),
  tramite: (id, note) => ({
    title: '⚖️ En Trámite Legal',
    body: `Tu expediente ${formatId(id)} se encuentra actualmente en gestión ante la autoridad de tránsito.${note ? `\n\n💬 Nota: ${note}` : ''}`,
  }),
  resolucion: (id, note) => ({
    title: '🏛️ En Resolución',
    body: `Estamos esperando el fallo de la autoridad sobre tu expediente ${formatId(id)}.${note ? `\n\n💬 Nota: ${note}` : ''}`,
  }),
  en_espera: (id, note) => ({
    title: '⏳ En Espera',
    body: `Tu expediente ${formatId(id)} está en pausa esperando una acción externa.${note ? `\n\n💬 Nota: ${note}` : ''}`,
  }),
  descartado: (id, note) => ({
    title: '❌ Expediente Descartado',
    body: `Tu solicitud para el expediente ${formatId(id)} ha sido descartada tras el análisis técnico.${note ? `\n\n💬 Nota: ${note}` : ''}`,
  }),
  finalizado: (id, note) => ({
    title: '✅ Expediente Finalizado',
    body: `El proceso de tu expediente ${formatId(id)} ha concluido. Ingresa para ver el dictamen final.${note ? `\n\n💬 Nota: ${note}` : ''}`,
  }),
  archivo: (id, note) => ({
    title: '📁 Expediente Archivado',
    body: `Tu expediente ${formatId(id)} ha sido movido al archivo general.${note ? `\n\n💬 Nota: ${note}` : ''}`,
  }),
};

/**
 * Envía una notificación push a un token FCM específico basado en el nuevo estado de un caso.
 * Si el token es inválido, lo limpia de Firestore automáticamente.
 *
 * @deprecated Usar `dispatchPush` de `@/lib/notifications/notification-dispatcher` para nuevas implementaciones.
 *   Esta función se mantiene por compatibilidad con código existente.
 */
export async function sendCaseUpdateNotification(
  fcmToken: string,
  newStatus: string,
  caseId: string,
  trackingUrl?: string
) {
  try {
    const templateFn = STATUS_TEMPLATES[newStatus.toLowerCase()];
    if (!templateFn) {
      logger.info('[PushNotifications] No hay plantilla para el estado:', { newStatus });
      return;
    }

    const { title, body } = templateFn(caseId);

    const message = {
      token: fcmToken,
      notification: { title, body },
      data: {
        caseId,
        type: 'status_update',
      },
      webpush: {
        fcmOptions: {
          link: trackingUrl || 'https://desmulta.online/estado',
        },
        notification: {
          icon: 'https://desmulta.online/icon.png',
          badge: 'https://desmulta.online/maskable_icon.png',
        },
      },
      android: {
        priority: 'high' as const,
        notification: {
          color: '#D4AF37',
        },
      },
    };

    const response = await getMessaging().send(message);
    logger.info('[PushNotifications] Notificación enviada con éxito:', {
      response,
      caseId,
      newStatus,
    });
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
    const esTokenInvalido =
      errorMsg.includes('registration-token-not-registered') ||
      errorMsg.includes('invalid-registration-token') ||
      errorMsg.includes('invalid-argument');

    if (esTokenInvalido) {
      // FIX FALLA 5: Limpiar el token inválido de Firestore para no reintentar indefinidamente
      logger.warn('[PushNotifications] Token FCM inválido — iniciando limpieza en Firestore', {
        caseId,
        newStatus,
      });
      try {
        const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
        const db = getFirestore();
        // Buscar y limpiar tanto en consultations como en cases
        for (const coleccion of ['consultations', 'cases']) {
          const snap = await db
            .collection(coleccion)
            .where('fcmToken', '==', fcmToken)
            .limit(1)
            .get();
          if (!snap.empty) {
            await snap.docs[0].ref.update({
              fcmToken: FieldValue.delete(),
              fcmTokenInvalidatedAt: FieldValue.serverTimestamp(),
            });
          }
        }
      } catch (cleanErr) {
        logger.error('[PushNotifications] Error al limpiar token inválido', {
          error: cleanErr instanceof Error ? cleanErr.message : 'Error desconocido',
        });
      }
      return;
    }

    logger.error('[PushNotifications] Error al enviar notificación:', {
      error: errorMsg,
      caseId,
      newStatus,
    });
  }
}
