import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger/security-logger';
import { timingSafeEqual } from 'crypto';

/**
 * GET /api/payments/status
 *
 * Devuelve únicamente el estado de pago y el tipo de producto de una compra
 * a partir de la referencia (ref) y validando el token de descarga, previniendo la exposición de PII y la enumeración (IDOR).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ref = searchParams.get('ref');
    const downloadToken = req.cookies.get(`dt_${ref}`)?.value;

    if (!ref) {
      return NextResponse.json({ error: 'Referencia requerida' }, { status: 400 });
    }

    if (!downloadToken || downloadToken.trim() === '') {
      logger.security('[api/payments/status] Intento de acceso sin token de descarga', { ref });
      return NextResponse.json(
        { error: 'No autorizado. Token de descarga requerido.' },
        { status: 401 }
      );
    }

    const db = getFirestore(getAdminApp());
    const purchaseSnap = await db.collection('purchases').doc(ref).get();

    if (!purchaseSnap.exists) {
      return NextResponse.json({ error: 'Compra no encontrada' }, { status: 404 });
    }

    const purchase = purchaseSnap.data();
    if (!purchase) {
      return NextResponse.json({ error: 'Datos no encontrados' }, { status: 404 });
    }

    // Validar el token de descarga
    const expected = Buffer.from(purchase.downloadToken || '');
    const received = Buffer.from(downloadToken || '');
    const isLengthOk = expected.length === received.length;
    const isTokenValid =
      isLengthOk &&
      expected.length > 0 &&
      received.length > 0 &&
      timingSafeEqual(expected, received);

    if (!isTokenValid) {
      logger.security('[api/payments/status] Token de descarga inválido (IDOR detectado)', {
        ref,
        receivedToken: downloadToken,
      });
      return NextResponse.json(
        { error: 'No autorizado. Token de descarga inválido.' },
        { status: 401 }
      );
    }

    // Retornar estrictamente solo el estado, el tipo de producto y datos públicos no-PII
    return NextResponse.json({
      status: purchase.status || 'PENDING',
      productType: purchase.productType || 'peticion_general',
      caseData: {
        autoridadTransito: purchase.caseData?.autoridadTransito || '',
      },
    });
  } catch (error) {
    logger.error('[api/payments/status] Error al obtener estado de compra:', {
      error: String(error),
    });
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
