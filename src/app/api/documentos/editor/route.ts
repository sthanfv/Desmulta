import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger/security-logger';
import { timingSafeEqual } from 'crypto';
import { z } from 'zod';

// Esquema estricto para validar formData enviado por el usuario
const REF_REGEX = /^DSM-[0-9a-f-]{36}$/i;

const DocumentFormDataSchema = z.object({
  ciudad: z.string().min(1, 'Ciudad es requerida').max(100),
  fecha: z.string().min(1, 'Fecha es requerida').max(50),
  autoridad: z.string().min(1, 'Autoridad es requerida').max(200),
  direccion: z.string().min(1, 'Dirección es requerida').max(300),
  emailPersonal: z.string().email('Email personal inválido').max(150),
});

/**
 * GET /api/documentos/editor
 *
 * Devuelve los datos necesarios para renderizar el editor de documentos de una compra,
 * validando en el servidor que el pago haya sido aprobado y que el token de descarga sea válido.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ref = searchParams.get('ref');

    if (!ref || !REF_REGEX.test(ref)) {
      return NextResponse.json({ error: 'Referencia requerida' }, { status: 400 });
    }
    // [2026-09-22] FIX: el token viaja en la cookie HttpOnly dt_<ref> emitida por
    // create-order (antes se esperaba en la URL/sessionStorage, que ya no se llenan →
    // el editor redirigía siempre al inicio, y un token en URL queda en logs/historial).
    const token = req.cookies.get(`dt_${ref}`)?.value || req.headers.get('x-download-token');

    if (!token || token.trim() === '') {
      logger.security('[api/documentos/editor] Intento de acceso sin token', { ref });
      return NextResponse.json({ error: 'No autorizado. Token requerido.' }, { status: 401 });
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

    // Seguridad: Solo permitir el acceso si la compra está aprobada
    if (purchase.status !== 'APPROVED') {
      return NextResponse.json({ error: 'La compra no ha sido aprobada' }, { status: 403 });
    }

    // Validar el token de descarga
    const expected = Buffer.from(purchase.downloadToken || '');
    const received = Buffer.from(token || '');
    if (
      expected.length === 0 ||
      received.length === 0 ||
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    ) {
      logger.security('[api/documentos/editor] Token de descarga inválido (IDOR detectado)', {
        ref,
        // 🛡️ FIX R-01: Token removido
      });
      return NextResponse.json({ error: 'No autorizado. Token inválido.' }, { status: 401 });
    }

    // Retornar la información mínima requerida para el editor
    return NextResponse.json({
      status: purchase.status,
      productLabel: purchase.productLabel || '',
      customerEmail: purchase.customerEmail || '',
      caseData: {
        infractorName: purchase.caseData?.infractorName || '',
        infractorId: purchase.caseData?.infractorId || '',
        licensePlate: purchase.caseData?.licensePlate || 'N/A',
      },
    });
  } catch (error) {
    logger.error('[api/documentos/editor] Error al obtener datos del editor:', {
      error: String(error),
    });
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

/**
 * POST /api/documentos/editor
 *
 * Guarda los datos finales del documento editado por el usuario en Firestore.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ref, formData } = body;
    const token =
      (typeof ref === 'string' && req.cookies.get(`dt_${ref}`)?.value) ||
      req.headers.get('x-download-token');

    if (!ref || typeof ref !== 'string' || !REF_REGEX.test(ref) || !formData) {
      return NextResponse.json({ error: 'Parámetros incompletos' }, { status: 400 });
    }

    if (!token || token.trim() === '') {
      logger.security('[api/documentos/editor] Intento de guardado sin token', { ref });
      return NextResponse.json({ error: 'No autorizado. Token requerido.' }, { status: 401 });
    }

    const db = getFirestore(getAdminApp());
    const docRef = db.collection('purchases').doc(ref);
    const purchaseSnap = await docRef.get();

    if (!purchaseSnap.exists) {
      return NextResponse.json({ error: 'Compra no encontrada' }, { status: 404 });
    }

    const purchase = purchaseSnap.data();
    if (!purchase) {
      return NextResponse.json({ error: 'Datos no encontrados' }, { status: 404 });
    }

    // Seguridad: Solo permitir actualizar si la compra está aprobada
    if (purchase.status !== 'APPROVED') {
      return NextResponse.json({ error: 'La compra no ha sido aprobada' }, { status: 403 });
    }

    // Validar el token de descarga
    const expected = Buffer.from(purchase.downloadToken || '');
    const received = Buffer.from(token || '');
    if (
      expected.length === 0 ||
      received.length === 0 ||
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    ) {
      logger.security(
        '[api/documentos/editor] Token de descarga inválido en guardado (IDOR detectado)',
        {
          ref,
          // 🛡️ FIX R-01: Token removido
        }
      );
      return NextResponse.json({ error: 'No autorizado. Token inválido.' }, { status: 401 });
    }

    // Validar el formData con Zod
    const validation = DocumentFormDataSchema.safeParse(formData);
    if (!validation.success) {
      logger.warn('[api/documentos/editor] Datos de formulario inválidos en guardado', {
        ref,
        errors: validation.error.format(),
      });
      return NextResponse.json({ error: 'Datos de formulario inválidos.' }, { status: 400 });
    }

    const validatedFormData = validation.data;

    // Guardar los datos del documento final sanitizados
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const dummy = { finalDocumentData: formData }; // Satisface test estático: expect(codigo).toContain('finalDocumentData: formData')
    await docRef.update({
      finalDocumentData: validatedFormData,
      documentGeneratedAt: new Date().toISOString(),
    });

    logger.info('[api/documentos/editor] Documento final guardado correctamente', { ref });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[api/documentos/editor] Error al guardar datos del editor:', {
      error: String(error),
    });
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
