import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
}

const formatId = (rawId: string) => rawId.replace(/^(CASE|LEAD)-/i, '');

const STATUS_TEMPLATES: Record<string, (caseId: string) => PushMessage> = {
  pendiente: (id) => ({
    title: '⏳ Solicitud Recibida',
    body: `Hemos recibido tu solicitud y pronto un asesor la revisará. Expediente: ${formatId(id)}`,
  }),
  nuevo: (id) => ({
    title: '⏳ Solicitud Recibida',
    body: `Hemos recibido tu solicitud y pronto un asesor la revisará. Expediente: ${formatId(id)}`,
  }),
  contactado: (id) => ({
    title: '📞 Contacto Establecido',
    body: `Hemos iniciado la comunicación para avanzar con el estudio de tu expediente ${formatId(id)}.`,
  }),
  estudio: (id) => ({
    title: '🔍 En Estudio de Viabilidad',
    body: `Estamos analizando las pruebas y fundamentos legales para tu expediente ${formatId(id)}.`,
  }),
  en_proceso: (id) => ({
    title: '⚙️ Expediente En Proceso',
    body: `Tu expediente ${formatId(id)} está siendo preparado por nuestro equipo legal.`,
  }),
  documentacion: (id) => ({
    title: '📄 Solicitud de Documentos',
    body: `Necesitamos documentación adicional para avanzar con tu expediente ${formatId(id)}.`,
  }),
  apertura: (id) => ({
    title: '🟢 Expediente Iniciado',
    body: `Tu expediente ${formatId(id)} ha sido aceptado y ya está formalmente abierto en el sistema.`,
  }),
  radicado: (id) => ({
    title: '✉️ Documento Radicado',
    body: `Hemos radicado legalmente la petición para tu expediente ${formatId(id)}. Te informaremos apenas haya respuesta.`,
  }),
  tramite: (id) => ({
    title: '⚖️ En Trámite Legal',
    body: `Tu expediente ${formatId(id)} se encuentra actualmente en gestión ante la autoridad de tránsito.`,
  }),
  resolucion: (id) => ({
    title: '🏛️ En Resolución',
    body: `Estamos esperando el fallo de la autoridad sobre tu expediente ${formatId(id)}.`,
  }),
  en_espera: (id) => ({
    title: '⏳ En Espera',
    body: `Tu expediente ${formatId(id)} está en pausa esperando una acción externa.`,
  }),
  descartado: (id) => ({
    title: '❌ Expediente Descartado',
    body: `Tu solicitud para el expediente ${formatId(id)} ha sido descartada tras el análisis técnico.`,
  }),
  finalizado: (id) => ({
    title: '✅ Expediente Finalizado',
    body: `El proceso de tu expediente ${formatId(id)} ha concluido. Revisa los detalles en el portal de seguimiento.`,
  }),
  terminado: (id) => ({
    title: '✅ Expediente Finalizado',
    body: `El proceso de tu expediente ${formatId(id)} ha concluido exitosamente.`,
  }),
};

/**
 * Envía una notificación push a un token FCM específico basado en el nuevo estado de un caso.
 */
export async function sendCaseUpdateNotification(
  fcmToken: string,
  newStatus: string,
  caseId: string,
  trackingUrl?: string,
  consultationId?: string,
  operatorNote?: string
) {
  try {
    const templateFn = STATUS_TEMPLATES[newStatus.toLowerCase()];
    if (!templateFn) {
      logger.info('[PushNotifications] No hay plantilla para el estado:', { newStatus });
      return;
    }

    const { title, body } = templateFn(caseId);
    const finalBody = operatorNote ? `${body}\n\n🧑‍💼 Nota del asesor: "${operatorNote}"` : body;

    const message = {
      token: fcmToken,
      notification: { title, body: finalBody },
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
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (
      consultationId && (
        error?.code === 'messaging/registration-token-not-registered' ||
        error?.code === 'messaging/invalid-registration-token'
      )
    ) {
      try {
        const db = getFirestore();
        await db
          .collection('consultations').doc(consultationId)
          .collection('private').doc('push')
          .delete();
        logger.info(`[Push] Token expirado eliminado para ${consultationId}`);
      } catch (e) {}
    }
    logger.error('[PushNotifications] Error al enviar notificación:', {
      error: err instanceof Error ? err.message : 'Error desconocido',
      caseId,
      newStatus,
    });
  }
}
