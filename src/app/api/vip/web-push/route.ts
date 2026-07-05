import { NextResponse, NextRequest } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getVipSecret } from '@/lib/security/vip-jwt';
import { jwtVerify } from 'jose';
import { rateLimit } from '@/lib/security/rate-limit';
import { logger } from '@/lib/logger/security-logger';

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('_vip_session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const rlResult = await rateLimit(`web-push:${sessionToken}`, 5, 5 * 60 * 1000);
    if (!rlResult.success) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intente más tarde.' },
        { status: 429 }
      );
    }

    let payload;
    try {
      const verified = await jwtVerify(sessionToken, getVipSecret());
      payload = verified.payload as { hashedCedula: string; hashedCelular: string };
    } catch (_error) {
      return NextResponse.json({ error: 'Sesión inválida o expirada' }, { status: 401 });
    }

    const { expedienteId, fcmToken } = await request.json();

    if (!expedienteId || !fcmToken) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
    }

    if (typeof fcmToken !== 'string' || fcmToken.length < 50 || fcmToken.length > 500) {
      return NextResponse.json({ error: 'Token FCM inválido' }, { status: 400 });
    }

    getAdminApp();
    const db = getFirestore();

    // Buscar el expediente y actualizar
    // Puede ser caso o consulta
    let docRef = db.collection('cases').doc(expedienteId);
    let docSnap = await docRef.get();

    if (!docSnap.exists) {
      docRef = db.collection('consultations').doc(expedienteId);
      docSnap = await docRef.get();

      if (!docSnap.exists) {
        return NextResponse.json({ error: 'Expediente no encontrado' }, { status: 404 });
      }
    }

    if (docSnap.data()?.cedulaHash !== payload.hashedCedula) {
      return NextResponse.json({ error: 'Prohibido: Ownership mismatch' }, { status: 403 });
    }

    // Actualizar el documento con el token FCM en la subcolección private/push
    await docRef.collection('private').doc('push').set(
      {
        fcmToken: fcmToken,
        pushOptInAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true, message: 'FCM Token vinculado exitosamente.' });
  } catch (error) {
    logger.error('Error al registrar web push vip', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
