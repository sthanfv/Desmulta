/**
 * POST /api/web-push/revoke
 *
 * Endpoint invocado cuando el usuario revoca los permisos de notificación
 * desde la configuración de su navegador.
 *
 * Limpia el token FCM en Firestore para evitar intentos de envío
 * con tokens inválidos que generan errores en FCM y desperdician recursos.
 *
 * MANDATO-FILTRO v8.12.0 — Zero-PII: No se persiste ningún dato del usuario.
 */

import { NextResponse } from 'next/server';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';
import { rateLimit } from '@/lib/security/rate-limit';
import { logger } from '@/lib/logger/security-logger';

// Validar docId o shortId
function isValidDocId(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  return /^[A-Za-z0-9\-_]{5,100}$/.test(id);
}

export async function POST(request: Request) {
  try {
    const { getSecureIp } = await import('@/lib/security/ip-utils');
    const ip = getSecureIp(request);
    const { success } = await rateLimit(ip, 10, 60 * 1000, 'web_push_revoke_rl');
    if (!success) {
      return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Cuerpo de la solicitud inválido.' }, { status: 400 });
    }

    const { docId } = (body as Record<string, unknown>) || {};

    if (!isValidDocId(docId)) {
      return NextResponse.json({ error: 'docId inválido.' }, { status: 400 });
    }

    getAdminApp();
    const db = getFirestore();

    const idStr = docId as string;
    let targetDocRef = db.collection('consultations').doc(idStr);
    let docSnap = await targetDocRef.get();

    // Si no existe, podría ser un shortId
    if (!docSnap.exists && (idStr.startsWith('EXP-') || idStr.startsWith('LEAD-'))) {
      const querySnap = await db
        .collection('consultations')
        .where('shortId', '==', idStr)
        .limit(1)
        .get();
      if (!querySnap.empty) {
        targetDocRef = querySnap.docs[0].ref;
        docSnap = querySnap.docs[0];
      }
    }

    if (!docSnap.exists) {
      // Responder 200 genérico — no revelar si el ID existe o no
      return NextResponse.json({ success: true });
    }

    // Eliminar token FCM del campo raíz
    await targetDocRef.update({
      fcmToken: FieldValue.delete(),
      fcmTokenRevokedAt: FieldValue.serverTimestamp(),
      pushOptOut: true,
    });

    // Eliminar token FCM de la subcolección private/push
    try {
      await targetDocRef.collection('private').doc('push').update({
        fcmToken: FieldValue.delete(),
        pushOptOut: true,
        revokedAt: FieldValue.serverTimestamp(),
        revokedReason: 'USER_DENIED',
      });
    } catch {
      // La subcolección puede no existir, ignorar
    }

    logger.info('[PushRevoke] Token FCM revocado correctamente para expediente', { id: idStr });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logger.error('[PushRevoke] Error crítico al revocar token FCM:', {
      error: error instanceof Error ? error.message : 'Error desconocido',
    });
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
