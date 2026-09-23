import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
}

const formatId = (rawId: string) => rawId.replace(/^(CASE|LEAD)-/i, '');

const formatBody = (id: string, message: string, note?: string) => {
  let bodyText = `Expediente: ${formatId(id)}\n\n${message}`;
  if (note && note.trim() !== '') {
    bodyText += `\n\n💬 Nota del especialista:\n"${note.trim()}"`;
  }
  return bodyText;
};

const STATUS_TEMPLATES: Record<string, (caseId: string, note?: string) => PushMessage> = {
  pendiente: (id, note) => ({
    title: '⏳ Solicitud Recibida',
    body: formatBody(id, 'Hemos recibido tu solicitud y pronto nuestro equipo la revisará.', note),
  }),
  nuevo: (id, note) => ({
    title: '⏳ Solicitud Recibida',
    body: formatBody(id, 'Hemos recibido tu solicitud y pronto nuestro equipo la revisará.', note),
  }),
  contactado: (id, note) => ({
    title: '📞 Contacto Establecido',
    body: formatBody(id, 'Hemos iniciado la comunicación para avanzar con tu caso.', note),
  }),
  estudio: (id, note) => ({
    title: '🔍 Estudio de Viabilidad',
    body: formatBody(
      id,
      'Estamos analizando las pruebas y fundamentos para darte una respuesta definitiva.',
      note
    ),
  }),
  en_proceso: (id, note) => ({
    title: '⚙️ Expediente en Proceso',
    body: formatBody(id, 'Tu expediente está siendo estructurado por nuestro equipo legal.', note),
  }),
  documentacion: (id, note) => ({
    title: '📄 Documentación Pendiente',
    body: formatBody(id, 'Requerimos documentos adicionales para continuar con la gestión.', note),
  }),
  apertura: (id, note) => ({
    title: '🟢 Expediente Iniciado',
    body: formatBody(
      id,
      'Tu caso ha sido aprobado y ya está formalmente abierto en el sistema.',
      note
    ),
  }),
  radicado: (id, note) => ({
    title: '✉️ Petición Radicada',
    body: formatBody(
      id,
      'Hemos radicado formalmente los documentos ante el organismo de tránsito.',
      note
    ),
  }),
  tramite: (id, note) => ({
    title: '⚖️ Trámite Legal Activo',
    body: formatBody(
      id,
      'Tu caso se encuentra actualmente en gestión ante las autoridades viales.',
      note
    ),
  }),
  resolucion: (id, note) => ({
    title: '🏛️ En Resolución',
    body: formatBody(
      id,
      'Esperando el fallo o pronunciamiento oficial de la autoridad de tránsito.',
      note
    ),
  }),
  en_espera: (id, note) => ({
    title: '⏳ Gestión en Espera',
    body: formatBody(id, 'Tu caso está en pausa temporal aguardando una acción externa.', note),
  }),
  descartado: (id, note) => ({
    title: '❌ Expediente Descartado',
    body: formatBody(
      id,
      'Tu solicitud ha sido descartada tras completar el análisis técnico.',
      note
    ),
  }),
  finalizado: (id, note) => ({
    title: '✅ Expediente Finalizado',
    body: formatBody(
      id,
      'El proceso de tu expediente ha concluido. Revisa el portal para ver el resultado.',
      note
    ),
  }),
  terminado: (id, note) => ({
    title: '✅ Expediente Finalizado',
    body: formatBody(id, 'El proceso de tu expediente ha concluido exitosamente.', note),
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
  operatorNote?: string,
  shortId?: string
) {
  try {
    const templateFn = STATUS_TEMPLATES[newStatus.toLowerCase()];
    if (!templateFn) {
      logger.info('[PushNotifications] No hay plantilla para el estado:', { newStatus });
      return;
    }

    const displayId = shortId || caseId;
    const { title, body } = templateFn(displayId, operatorNote);
    const finalBody = body;

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
      consultationId &&
      (error?.code === 'messaging/registration-token-not-registered' ||
        error?.code === 'messaging/invalid-registration-token')
    ) {
      try {
        const db = getFirestore();
        await db
          .collection('consultations')
          .doc(consultationId)
          .collection('private')
          .doc('push')
          .delete();
        logger.info(`[Push] Token expirado eliminado para ${consultationId}`);
      } catch (_e) {}
    }
    logger.error('[PushNotifications] Error al enviar notificación:', {
      error: err instanceof Error ? err.message : 'Error desconocido',
      caseId,
      newStatus,
    });
  }
}
