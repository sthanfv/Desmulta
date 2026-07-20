import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { generateMandatePDF, MandatePayload } from '@/lib/legal/pdf-engine';
import { generateMandateDOCX } from '@/lib/legal/docx-engine';
import { DocumentType } from '@/lib/legal/document-templates';
import { logger } from '@/lib/logger/security-logger';
import { Redis } from '@upstash/redis';
import { timingSafeEqual } from 'crypto';
const redis = Redis.fromEnv();

export async function GET(req: NextRequest) {
  try {
    const dlSession = req.cookies.get('dl_session')?.value;
    let tokenId = '';
    let refId = req.nextUrl.searchParams.get('ref') || '';
    let downloadToken = '';

    if (dlSession) {
      const sessionData = await redis.get(`dl:${dlSession}`);
      if (!sessionData) {
        return new NextResponse('Sesión de descarga expirada o inválida', { status: 403 });
      }
      // 🛡️ FIX V2-C2: Descarga de un solo uso, invalidar sesión inmediatamente
      await redis.del(`dl:${dlSession}`);

      const parsed = typeof sessionData === 'string' ? JSON.parse(sessionData) : sessionData;
      tokenId = parsed.token || '';
      refId = parsed.ref || refId;
      downloadToken = parsed.downloadToken || '';
    } else if (refId) {
      // Fallback para descargas directas desde confirmación usando la cookie dt_ref
      downloadToken = req.cookies.get(`dt_${refId}`)?.value || '';
    } else {
      return new NextResponse('No autorizado. Falta sesión de descarga o referencia.', {
        status: 401,
      });
    }

    const format = req.nextUrl.searchParams.get('format') || 'pdf';

    if (!tokenId && !refId) {
      return new NextResponse('Falta el parametro token o ref', { status: 400 });
    }

    const db = getFirestore(getAdminApp());
    let payload: MandatePayload;
    let filename: string;
    let purchaseId = '';
    let productType = '';

    if (tokenId) {
      // ── FLUJO 1: DESCARGA POR TOKEN (CORREO ELECTRÓNICO) ──
      const tokenSnap = await db.collection('pdf_tokens').doc(tokenId).get();
      if (!tokenSnap.exists) {
        return new NextResponse('Enlace inválido o documento no encontrado', { status: 404 });
      }
      const tokenData = tokenSnap.data();
      if (!tokenData) {
        return new NextResponse('Datos de token no encontrados', { status: 404 });
      }

      // Verificar expiración
      const expiresAt = tokenData.expiresAt?.toDate
        ? tokenData.expiresAt.toDate()
        : new Date(tokenData.expiresAt);
      if (new Date() > expiresAt) {
        return new NextResponse('El enlace de descarga ha expirado (límite 72 horas)', {
          status: 403,
        });
      }

      // Verificar límite de descargas
      if (tokenData.downloadCount >= tokenData.maxDownloads) {
        return new NextResponse(
          'Se ha alcanzado el límite máximo de descargas para este documento',
          { status: 403 }
        );
      }

      // Incrementar contador de descargas
      await db
        .collection('pdf_tokens')
        .doc(tokenId)
        .update({
          downloadCount: FieldValue.increment(1),
        });

      purchaseId = tokenData.purchaseId;
      productType = tokenData.productType;

      const purchaseSnap = await db.collection('purchases').doc(tokenData.purchaseId).get();
      const purchase = purchaseSnap.data();

      // 🛡️ FIX H-16: caseData se recupera desde purchases (colección protegida),
      // ya que pdf_tokens ya no lo almacena para evitar PII en colección pública.
      const caseData = purchase?.caseData;
      if (!caseData) {
        return new NextResponse('Datos del caso no encontrados en la compra', { status: 404 });
      }

      payload = {
        ...caseData,
        ticketNumber: caseData?.ticketNumber ?? '',
        licensePlate: caseData?.licensePlate ?? '',
        shortId: caseData?.shortId ?? tokenData.purchaseId.slice(-6).toUpperCase(),
        infractorName: caseData?.infractorName ?? '',
        infractorId: caseData?.infractorId ?? '',
        documentType: tokenData.productType as DocumentType,
        operatorName: 'SISTEMA AUTOMATIZADO DESMULTA',
        operatorId: 'NIT 900.000.000-1',
        acceptedAt: purchase?.paidAt
          ? purchase.paidAt.toDate().toISOString()
          : new Date().toISOString(),
      };
      filename = `Documento_Desmulta_${caseData?.shortId || tokenData.purchaseId.slice(-8).toUpperCase()}.pdf`;
    } else if (refId) {
      // ── FLUJO 2: DESCARGA DIRECTA (PANTALLA DE CONFIRMACIÓN) ──
      if (!downloadToken || downloadToken.trim() === '') {
        logger.security('[documentos/download] Intento de descarga sin token de descarga', {
          refId,
        });
        return new NextResponse('No autorizado. Token de descarga requerido.', { status: 401 });
      }

      const purchaseSnap = await db.collection('purchases').doc(refId).get();
      if (!purchaseSnap.exists) {
        return new NextResponse('Compra no encontrada', { status: 404 });
      }
      const purchase = purchaseSnap.data();

      // Validar el token de descarga
      const expected = Buffer.from(purchase?.downloadToken || '');
      const provided = Buffer.from(downloadToken || '');
      const isLengthOk = expected.length === provided.length;
      const isTokenValid = isLengthOk && timingSafeEqual(expected, provided);

      if (!purchase || !isTokenValid) {
        logger.security(
          '[documentos/download] Intento de descarga con token inválido (IDOR bloqueado)',
          {
            refId,
            // 🛡️ FIX R-01: Remover logging del token provisto en texto plano
          }
        );
        return new NextResponse('No autorizado. Token de descarga inválido.', { status: 401 });
      }

      purchaseId = refId;
      productType = purchase.productType || '';

      // Seguridad: Solo permitir descarga directa si el pago fue aprobado
      if (purchase.status !== 'APPROVED') {
        return new NextResponse(
          'El pago no ha sido aprobado. No se puede descargar el documento.',
          { status: 403 }
        );
      }

      // 🛡️ FIX: Validar expiración del downloadToken (Hallazgo 5)
      const expiresAt = purchase.downloadTokenExpiresAt?.toDate
        ? purchase.downloadTokenExpiresAt.toDate()
        : purchase.downloadTokenExpiresAt
          ? new Date(purchase.downloadTokenExpiresAt)
          : null;

      if (expiresAt && new Date() > expiresAt) {
        return new NextResponse('El enlace de descarga ha expirado (límite 72 horas).', {
          status: 403,
        });
      }

      // 🛡️ FIX: Validar límite de descargas (Hallazgo 5)
      const downloadCount = purchase.downloadCount || 0;
      const maxDownloads = purchase.maxDownloads || 5;
      if (downloadCount >= maxDownloads) {
        return new NextResponse(
          'Se ha alcanzado el límite máximo de descargas para este documento.',
          { status: 403 }
        );
      }

      // Incrementar contador de descargas
      await db
        .collection('purchases')
        .doc(refId)
        .update({
          downloadCount: FieldValue.increment(1),
        });

      if (!purchase.caseData) {
        return new NextResponse('Datos del caso no encontrados en la compra', { status: 404 });
      }

      payload = {
        ...purchase.caseData,
        ticketNumber: purchase.caseData?.ticketNumber ?? '',
        licensePlate: purchase.caseData?.licensePlate ?? '',
        shortId: purchase.caseData?.shortId ?? refId.slice(-6).toUpperCase(),
        infractorName: purchase.caseData?.infractorName ?? '',
        infractorId: purchase.caseData?.infractorId ?? '',
        documentType: purchase.productType as DocumentType,
        operatorName: 'SISTEMA AUTOMATIZADO DESMULTA',
        operatorId: 'NIT 900.000.000-1',
        acceptedAt: purchase.paidAt
          ? purchase.paidAt.toDate().toISOString()
          : new Date().toISOString(),
      };

      const fileExt = format === 'docx' ? 'docx' : 'pdf';
      filename = `Documento_Desmulta_${purchase.caseData?.shortId || refId.slice(-8).toUpperCase()}.${fileExt}`;
    } else {
      return new NextResponse('Bad request', { status: 400 });
    }

    let fileBytes: Uint8Array;
    let contentType: string;

    if (format === 'docx') {
      fileBytes = await generateMandateDOCX(payload);
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else {
      fileBytes = await generateMandatePDF(payload);
      contentType = 'application/pdf';
    }

    // 🛡️ F-03 DEVSECOPS: Registrar log de auditoría directamente en el servidor al descargar
    try {
      const { getSecureIp } = await import('@/lib/security/ip-utils');
      const ip = getSecureIp(req);
      const userAgent = req.headers.get('user-agent') || 'Unknown User-Agent';
      await db.collection('audit_logs').add({
        type: 'DOWNLOAD',
        format: format,
        purchaseId,
        documentType: productType,
        timestamp: FieldValue.serverTimestamp(),
        ipAddress: ip,
        userAgent,
      });
    } catch (auditErr) {
      logger.error('[documentos/download] Error al registrar descarga en auditoría:', {
        error: String(auditErr),
      });
    }

    const response = new NextResponse(fileBytes as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        Pragma: 'no-cache',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      },
    });

    // 🛡️ FIX V2-C2: Limpiar la cookie tras la descarga
    response.cookies.delete('dl_session');

    return response;
  } catch (error) {
    logger.error('[documentos/download] Error generando PDF de descarga:', {
      error: String(error),
    });
    return new NextResponse('Error Interno del Servidor', { status: 500 });
  }
}
