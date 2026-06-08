/**
 * Motor de Despacho de Notificaciones Push — notification-dispatcher.ts
 *
 * MANDATO-FILTRO v8.12.0 — Motor Centralizado:
 * Fuente de verdad: subcolección `consultations/{id}/private/push.fcmToken`
 * Fallback:         campo raíz `consultations/{id}.fcmToken`
 *
 * Responsabilidades:
 *   1. Localizar el token FCM correcto para un expediente dado.
 *   2. Enviar la notificación push usando Firebase Admin.
 *   3. Limpiar el token de Firestore si FCM lo rechaza por inválido.
 */

import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger/security-logger';

// Códigos de error de FCM que indican token permanentemente inválido
const INVALID_TOKEN_ERRORS = [
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
];

export interface DispatchResult {
  /** Indica si la notificación fue enviada correctamente */
  sent: boolean;
  /** Indica si se limpió un token inválido de Firestore */
  cleaned: boolean;
  /** Mensaje FCM si fue exitoso */
  messageId?: string;
  /** Razón del fallo si no fue enviado */
  reason?: string;
}

export interface PushPayload {
  title: string;
  body: string;
  /** URL de destino al tocar la notificación */
  url?: string;
  /** Datos adicionales enviados en el payload FCM */
  data?: Record<string, string>;
}

/**
 * Obtiene el token FCM para un expediente dado.
 * Prioridad: subcolección `private/push` > campo raíz del documento.
 *
 * @param expedienteId - ID del documento en la colección `consultations` o `cases`
 * @returns El token FCM o null si no hay token registrado
 */
export async function getFcmToken(
  expedienteId: string,
  coleccion: 'consultations' | 'cases' = 'consultations'
): Promise<string | null> {
  const db = getFirestore();

  // Fuente de verdad canónica: subcolección private/push
  try {
    const pushDoc = await db
      .collection(coleccion)
      .doc(expedienteId)
      .collection('private')
      .doc('push')
      .get();

    if (pushDoc.exists) {
      const token = pushDoc.data()?.fcmToken;
      if (token && typeof token === 'string' && token.length > 20) {
        return token;
      }
    }
  } catch (err) {
    logger.warn('[Dispatcher] Error leyendo subcolección private/push', {
      expedienteId,
      error: err instanceof Error ? err.message : 'Error desconocido',
    });
  }

  // Fallback: campo raíz del documento (retrocompatibilidad)
  try {
    const docSnap = await db.collection(coleccion).doc(expedienteId).get();
    const rootToken = docSnap.data()?.fcmToken;
    if (rootToken && typeof rootToken === 'string' && rootToken.length > 20) {
      logger.info('[Dispatcher] Token FCM obtenido desde campo raíz (fallback)', { expedienteId });
      return rootToken;
    }
  } catch (err) {
    logger.warn('[Dispatcher] Error leyendo campo raíz de consulta', {
      expedienteId,
      error: err instanceof Error ? err.message : 'Error desconocido',
    });
  }

  return null;
}

/**
 * Elimina el token FCM inválido tanto del campo raíz como de la subcolección.
 * Se invoca cuando FCM responde con un error de token no registrado.
 */
async function limpiarTokenInvalido(
  expedienteId: string,
  coleccion: 'consultations' | 'cases' = 'consultations'
): Promise<void> {
  const db = getFirestore();
  const { FieldValue } = await import('firebase-admin/firestore');

  try {
    // Limpiar campo raíz
    await db.collection(coleccion).doc(expedienteId).update({
      fcmToken: FieldValue.delete(),
      fcmTokenInvalidatedAt: FieldValue.serverTimestamp(),
    });
  } catch {
    // El campo puede no existir en el raíz, ignorar
  }

  try {
    // Limpiar subcolección
    await db
      .collection(coleccion)
      .doc(expedienteId)
      .collection('private')
      .doc('push')
      .update({
        fcmToken: FieldValue.delete(),
        fcmTokenInvalidatedAt: FieldValue.serverTimestamp(),
        tokenRevokedReason: 'FCM_NOT_REGISTERED',
      });
  } catch {
    // El documento puede no existir, ignorar
  }

  logger.warn('[Dispatcher] Token FCM inválido limpiado de Firestore', { expedienteId });
}

/**
 * Envía una notificación push a un expediente específico.
 *
 * El dispatcher busca el token FCM automáticamente y limpia los tokens
 * inválidos si FCM los rechaza.
 *
 * @param expedienteId - ID del documento en Firestore
 * @param payload     - Contenido de la notificación
 * @param coleccion   - Colección donde buscar el token ('consultations' o 'cases')
 */
export async function dispatchPush(
  expedienteId: string,
  payload: PushPayload,
  coleccion: 'consultations' | 'cases' = 'consultations'
): Promise<DispatchResult> {
  // 1. Obtener el token FCM
  const fcmToken = await getFcmToken(expedienteId, coleccion);

  if (!fcmToken) {
    logger.info('[Dispatcher] Sin token FCM registrado para el expediente', { expedienteId });
    return { sent: false, cleaned: false, reason: 'SIN_TOKEN' };
  }

  // 2. Construir el mensaje FCM
  const message = {
    token: fcmToken,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: {
      expedienteId,
      type: 'status_update',
      ...(payload.data || {}),
    },
    webpush: {
      fcmOptions: {
        link: payload.url || 'https://desmulta.online/estado',
      },
      notification: {
        icon: 'https://desmulta.online/icon.png',
        badge: 'https://desmulta.online/maskable_icon.png',
        requireInteraction: false,
        silent: false,
      },
    },
    android: {
      priority: 'high' as const,
      notification: {
        color: '#D4AF37',
        sound: 'default',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
        },
      },
    },
  };

  // 3. Enviar y manejar errores de token inválido
  try {
    const messageId = await getMessaging().send(message);
    logger.info('[Dispatcher] Notificación push enviada correctamente', {
      expedienteId,
      messageId,
    });
    return { sent: true, cleaned: false, messageId };
  } catch (error: unknown) {
    const errorCode =
      error instanceof Error
        ? (error as Error & { errorInfo?: { code: string } }).errorInfo?.code ||
          error.message
        : 'Error desconocido';

    // Verificar si el token es inválido de forma permanente
    const esTokenInvalido = INVALID_TOKEN_ERRORS.some(
      (code) =>
        errorCode.includes(code) ||
        (error instanceof Error && error.message.includes(code.split('/')[1]))
    );

    if (esTokenInvalido) {
      logger.warn('[Dispatcher] Token FCM rechazado por FCM — iniciando limpieza', {
        expedienteId,
        errorCode,
      });
      await limpiarTokenInvalido(expedienteId, coleccion);
      return { sent: false, cleaned: true, reason: 'TOKEN_INVALIDO_LIMPIADO' };
    }

    // Error transitorio (red, cuota FCM, etc.)
    logger.error('[Dispatcher] Error al enviar notificación push', {
      expedienteId,
      error: errorCode,
    });
    return { sent: false, cleaned: false, reason: errorCode };
  }
}
