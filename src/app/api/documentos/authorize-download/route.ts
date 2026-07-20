import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { Redis } from '@upstash/redis';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const redis = Redis.fromEnv();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, ref, downloadToken } = body;

    const db = getFirestore(getAdminApp());

    // Validar token/downloadToken (misma lógica que el GET actual)
    let isValid = false;

    if (token) {
      const snap = await db.collection('documentos_generados').where('tokenId', '==', token).get();
      if (!snap.empty) {
        isValid = true;
      }
    } else if (ref && downloadToken) {
      const purchaseSnap = await db.collection('purchases').doc(ref).get();
      if (purchaseSnap.exists) {
        const purchase = purchaseSnap.data();
        if (purchase && purchase.status === 'APPROVED') {
          // Validar expiración si existe
          const expiresAt = purchase.downloadTokenExpiresAt?.toDate
            ? purchase.downloadTokenExpiresAt.toDate()
            : purchase.downloadTokenExpiresAt
              ? new Date(purchase.downloadTokenExpiresAt)
              : null;

          if (!expiresAt || new Date() <= expiresAt) {
            const expected = Buffer.from(purchase.downloadToken || '');
            const provided = Buffer.from(downloadToken || '');

            if (
              expected.length > 0 &&
              provided.length > 0 &&
              expected.length === provided.length &&
              crypto.timingSafeEqual(expected, provided)
            ) {
              isValid = true;
            }
          }
        }
      }
    }

    if (!isValid) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 🛡️ FIX V2-C2: Emitir cookie HttpOnly de descarga de un solo uso (5 min)
    const downloadSession = crypto.randomBytes(32).toString('hex');
    await redis.set(`dl:${downloadSession}`, JSON.stringify({ token, ref, downloadToken }), {
      ex: 300, // 5 minutos
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set('dl_session', downloadSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/documentos/download',
      maxAge: 300,
    });

    return response;
  } catch (error) {
    console.error('[authorize-download] Error interno:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
