import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';
import { logger } from '@/lib/logger/security-logger';

// Validar token FCM
function isValidFcmToken(token: unknown): boolean {
  if (typeof token !== 'string') return false;
  return /^[a-zA-Z0-9\-_:+=.]{20,500}$/.test(token);
}

// Validar docId o shortId
function isValidDocIdOrShortId(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  // Firestore ID o shortId (ej. EXP-1-008, LEAD-2-001)
  return /^[A-Za-z0-9\-_]{5,100}$/.test(id);
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown-ip';
    const { rateLimit } = await import('@/lib/security/rate-limit');
    const { success } = await rateLimit(ip, 10, 60 * 1000, 'web_push_register_rl');
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const authHeader = request.headers.get('Authorization');
    let uid: string | undefined = undefined;

    if (authHeader?.startsWith('Bearer ')) {
      const idToken = authHeader.slice(7);
      try {
        const { getAuth } = await import('firebase-admin/auth');
        const decodedToken = await getAuth().verifyIdToken(idToken);
        uid = decodedToken.uid;
      } catch {
        // Ignorar
      }
    }

    getAdminApp();
    const db = getFirestore();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Cuerpo de la solicitud inválido.' }, { status: 400 });
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Formato de solicitud incorrecto.' }, { status: 400 });
    }

    const { docId, fcmToken } = body as Record<string, unknown>;

    if (!isValidDocIdOrShortId(docId)) {
      logger.warn('[Push Register] docId/shortId inválido', { docId });
      return NextResponse.json({ error: 'Parámetro docId inválido.' }, { status: 400 });
    }

    if (!isValidFcmToken(fcmToken)) {
      return NextResponse.json({ error: 'Token FCM inválido.' }, { status: 400 });
    }

    const idStr = docId as string;
    let targetDocRef = db.collection('consultations').doc(idStr);
    let docSnap = await targetDocRef.get();

    // Si no existe, podría ser un shortId (EXP- o LEAD-)
    if (!docSnap.exists) {
      if (idStr.startsWith('EXP-') || idStr.startsWith('LEAD-')) {
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
    }

    if (!docSnap.exists) {
      logger.info('[Push Register] docId o shortId no encontrado, respondiendo 200 genérico', {
        docId,
      });
      return NextResponse.json({ success: true, message: 'Solicitud procesada.' });
    }

    const now = new Date().toISOString();

    await targetDocRef
      .collection('private')
      .doc('push')
      .set(
        {
          fcmToken: fcmToken as string,
          pushOptInAt: now,
          tokenUpdatedAt: now,
          ...(uid ? { registeredByUid: uid } : {}),
        },
        { merge: true }
      );

    if (uid && docSnap.data()?.authorUid !== uid) {
      logger.info('[Push Register] Token registrado por UID distinto al autor', {
        uid,
        docId,
      });
    }

    return NextResponse.json({ success: true, message: 'FCM Token vinculado al expediente.' });
  } catch (error: unknown) {
    logger.error('[Push Register] Error crítico:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
