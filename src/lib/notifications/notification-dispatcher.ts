/**
 * Motor de Despacho de Notificaciones Push — notification-dispatcher.ts
 *
 * MANDATO-FILTRO v9.0.0 — Motor Centralizado con Trazabilidad Total:
 * - Fuente de verdad: subcolección `consultations/{id}/private/push.fcmToken`
 * - Fallback:         campo raíz `consultations/{id}.fcmToken`
 * - Registro de resultado: campo `_pushLog` en el documento principal
 *
 * Responsabilidades:
 *   1. Localizar el token FCM correcto para un expediente dado.
 *   2. Enviar la notificación push usando Firebase Admin.
 *   3. Limpiar el token de Firestore si FCM lo rechaza por inválido.
 *   4. Registrar el resultado (sent/no_token/invalid/error) en Firestore
 *      para que el admin sepa si el usuario fue notificado o no.
 */

import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger/security-logger';
import { sendTelegramPushError } from '@/lib/telegram';

// Códigos de error de FCM que indican token permanentemente inválido
const INVALID_TOKEN_ERRORS = [
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
  'registration-token-not-registered',
  'invalid-registration-token',
];

export type PushStatusCode = 'sent' | 'no_token' | 'token_invalid' | 'error' | 'no_template';

export interface DispatchResult {
  /** Indica si la notificación fue enviada correctamente */
  sent: boolean;
  /** Indica si se limpió un token inválido de Firestore */
  cleaned: boolean;
  /** Mensaje FCM si fue exitoso */
  messageId?: string;
  /** Código de estado estructurado */
  statusCode: PushStatusCode;
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

  try {
    await db.collection(coleccion).doc(expedienteId).update({
      fcmToken: FieldValue.delete(),
      fcmTokenInvalidatedAt: FieldValue.serverTimestamp(),
      // Marcar que el token fue invalidado — el cliente debe re-registrar
      pushTokenNeedsRenewal: true,
    });
  } catch {
    // El campo puede no existir en el raíz, ignorar
  }

  try {
    await db.collection(coleccion).doc(expedienteId).collection('private').doc('push').update({
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
 * Escribe el resultado del intento de push en el documento de Firestore.
 * Esto garantiza trazabilidad total — el admin puede ver si el usuario
 * fue notificado o no, y por qué razón.
 */
async function registrarResultadoPush(
  expedienteId: string,
  coleccion: 'consultations' | 'cases',
  result: DispatchResult,
  payload: PushPayload
): Promise<void> {
  const db = getFirestore();

  const logEntry = {
    at: new Date().toISOString(),
    status: result.statusCode,
    title: payload.title,
    ...(result.messageId ? { messageId: result.messageId } : {}),
    ...(result.reason ? { reason: result.reason } : {}),
  };

  try {
    await db
      .collection(coleccion)
      .doc(expedienteId)
      .update({
        // Último intento de push (sobrescribe): para estado rápido en el admin
        _lastPushAttempt: logEntry,
        // Historial acumulativo (máx. 20 entradas): para auditoría
        _pushLog: FieldValue.arrayUnion(logEntry),
        // Campo indexable para filtrar en el admin por "sin token"
        pushOptIn:
          result.statusCode === 'sent' || result.statusCode === 'token_invalid'
            ? true
            : result.statusCode === 'no_token'
              ? false
              : undefined,
      });
  } catch (err) {
    // No lanzar — el registro es best-effort, no debe bloquear el flujo
    logger.warn('[Dispatcher] No se pudo registrar log de push en Firestore', {
      expedienteId,
      error: err instanceof Error ? err.message : 'Error desconocido',
    });
  }
}

/**
 * Envía una notificación push a un expediente específico.
 *
 * El dispatcher busca el token FCM automáticamente, limpia tokens inválidos
 * y registra el resultado en Firestore para trazabilidad completa.
 *
 * @param expedienteId - ID del documento en Firestore
 * @param payload     - Contenido de la notificación
 * @param coleccion   - Colección donde buscar el token ('consultations' o 'cases')
 * @param skipLog     - Si true, no escribe el resultado en Firestore (para tests)
 */
export async function dispatchPush(
  expedienteId: string,
  payload: PushPayload,
  coleccion: 'consultations' | 'cases' = 'consultations',
  skipLog = false
): Promise<DispatchResult> {
  // 1. Obtener el token FCM
  const fcmToken = await getFcmToken(expedienteId, coleccion);

  if (!fcmToken) {
    logger.info('[Dispatcher] Sin token FCM registrado para el expediente', {
      expedienteId,
      action: 'El usuario no ha activado notificaciones o el token fue revocado.',
    });
    const result: DispatchResult = {
      sent: false,
      cleaned: false,
      statusCode: 'no_token',
      reason:
        'SIN_TOKEN: El usuario no ha concedido permiso de notificaciones o el token fue limpiado.',
    };
    if (!skipLog) {
      await registrarResultadoPush(expedienteId, coleccion, result, payload);
      await sendTelegramPushError(expedienteId, result.statusCode, result.reason || '');
    }
    return result;
  }

  // 2. Construir el mensaje FCM con soporte para Web, Android e iOS
  const message = {
    token: fcmToken,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: {
      expedienteId,
      type: 'status_update',
      url: payload.url || 'https://desmulta.online/estado',
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
        // vibrate: [200, 100, 200], // Solo para Android Web
      },
      headers: {
        Urgency: 'high',
        TTL: '86400', // 24 horas de TTL para entregar aunque el dispositivo esté offline
      },
    },
    android: {
      priority: 'high' as const,
      ttl: 86400000, // 24 horas en milisegundos
      notification: {
        color: '#D4AF37',
        sound: 'default',
        channelId: 'desmulta_cases',
        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
      },
    },
    apns: {
      headers: {
        'apns-priority': '10',
        'apns-expiration': String(Math.floor(Date.now() / 1000) + 86400),
      },
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
          'content-available': 1,
          'mutable-content': 1,
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
    const result: DispatchResult = {
      sent: true,
      cleaned: false,
      messageId,
      statusCode: 'sent',
    };
    if (!skipLog) await registrarResultadoPush(expedienteId, coleccion, result, payload);
    return result;
  } catch (error: unknown) {
    const errorCode =
      error instanceof Error
        ? (error as Error & { errorInfo?: { code: string } }).errorInfo?.code || error.message
        : 'Error desconocido';

    const esTokenInvalido = INVALID_TOKEN_ERRORS.some(
      (code) =>
        errorCode.includes(code) ||
        (error instanceof Error && error.message.includes(code.replace('messaging/', '')))
    );

    if (esTokenInvalido) {
      logger.warn('[Dispatcher] Token FCM rechazado por FCM — iniciando limpieza', {
        expedienteId,
        errorCode,
      });
      await limpiarTokenInvalido(expedienteId, coleccion);
      const result: DispatchResult = {
        sent: false,
        cleaned: true,
        statusCode: 'token_invalid',
        reason: `TOKEN_INVALIDO: FCM rechazó el token. Error: ${errorCode}. Se limpió de Firestore. El cliente debe re-registrar en su próxima visita.`,
      };
      if (!skipLog) {
        await registrarResultadoPush(expedienteId, coleccion, result, payload);
        await sendTelegramPushError(expedienteId, result.statusCode, result.reason || '');
      }
      return result;
    }

    // Error transitorio (red, cuota FCM, timeout, etc.)
    logger.error('[Dispatcher] Error transitorio al enviar notificación push', {
      expedienteId,
      error: errorCode,
    });
    const result: DispatchResult = {
      sent: false,
      cleaned: false,
      statusCode: 'error',
      reason: `ERROR_TRANSITORIO: ${errorCode}`,
    };
    if (!skipLog) {
      await registrarResultadoPush(expedienteId, coleccion, result, payload);
      await sendTelegramPushError(expedienteId, result.statusCode, result.reason || '');
    }
    return result;
  }
}
