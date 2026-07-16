import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';
import { timingSafeEqual } from 'crypto';
import { logger } from '@/lib/logger/security-logger';

/**
 * Endpoint interno de reintento de entrega de PDFs.
 *
 * Usado por la Cloud Function `retryFailedDeliveries` para reintentar
 * la entrega de documentos a compras aprobadas cuyo PDF no fue enviado
 * por un fallo temporal (red, Resend, timeout de Puppeteer, etc.).
 *
 * \ud83d\udee1\ufe0f FIX H-17: Implementa la lógica real que el TODO de `retryFailedDeliveries.ts`
 * dejaba pendiente. Sin este endpoint, las compras aprobadas sin PDF
 * podían quedar en ese estado indefinidamente.
 *
 * Autenticación: Bearer token via `INTERNAL_API_SECRET` con comparación
 * en tiempo constante (timingSafeEqual) para prevenir timing attacks.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Verificar autenticación del llamador interno
    const authHeader = req.headers.get('authorization') || '';
    const secret = process.env.INTERNAL_API_SECRET;

    if (!secret) {
      logger.error('[retry-pdf-delivery] INTERNAL_API_SECRET no configurado.');
      return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
    }

    const expected = `Bearer ${secret}`;
    // 🛡️ timingSafeEqual previene timing attacks en la verificación del secreto
    const isAuthValid =
      authHeader.length === expected.length &&
      timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));

    if (!isAuthValid) {
      logger.security('[retry-pdf-delivery] Intento de acceso no autorizado.', {
        headerLength: authHeader.length,
      });
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 2. Validar el body
    const { purchaseId } = await req.json().catch(() => ({}));
    if (!purchaseId || typeof purchaseId !== 'string') {
      return NextResponse.json({ error: 'purchaseId requerido' }, { status: 400 });
    }

    // 3. Obtener la compra de Firestore
    const db = getFirestore(getAdminApp());
    const snap = await db.collection('purchases').doc(purchaseId).get();

    if (!snap.exists) {
      logger.warn('[retry-pdf-delivery] Compra no encontrada.', { purchaseId });
      return NextResponse.json({ error: 'Compra no encontrada' }, { status: 404 });
    }

    const purchase = snap.data();

    // 4. Verificar que la compra realmente requiere reintento
    if (purchase?.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'La compra no está aprobada, no requiere reintento.' },
        { status: 409 }
      );
    }

    if (purchase?.pdfDeliveredAt) {
      return NextResponse.json(
        { error: 'El PDF ya fue entregado, no requiere reintento.' },
        { status: 409 }
      );
    }

    // 5. Ejecutar el reintento de entrega
    const { generarYEnviarPDF } = await import('@/lib/payments/pdf-delivery');
    await generarYEnviarPDF(purchase as Parameters<typeof generarYEnviarPDF>[0], db);

    logger.info('[retry-pdf-delivery] ✅ PDF entregado exitosamente en reintento.', {
      purchaseId,
    });

    return NextResponse.json({ success: true, purchaseId });
  } catch (error) {
    logger.error('[retry-pdf-delivery] Error en reintento de entrega de PDF.', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Error interno en el reintento' }, { status: 500 });
  }
}
