import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { generateMandatePDF, MandatePayload } from '@/lib/legal/pdf-engine';
import { generateMandateDOCX } from '@/lib/legal/docx-engine';
import { DocumentType } from '@/lib/legal/document-templates';
import { logger } from '@/lib/logger/security-logger';
import { timingSafeEqual } from 'crypto';
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tokenId = searchParams.get('token');
    const refId = searchParams.get('ref');
    const format = searchParams.get('format') || 'pdf';

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

      payload = {
        ...tokenData.caseData,
        ticketNumber: tokenData.caseData?.ticketNumber ?? '',
        licensePlate: tokenData.caseData?.licensePlate ?? '',
        shortId: tokenData.caseData?.shortId ?? tokenData.purchaseId.slice(-6).toUpperCase(),
        infractorName: tokenData.caseData?.infractorName ?? '',
        infractorId: tokenData.caseData?.infractorId ?? '',
        documentType: tokenData.productType as DocumentType,
        operatorName: 'SISTEMA AUTOMATIZADO DESMULTA',
        operatorId: 'NIT 900.000.000-1',
        acceptedAt: purchase?.paidAt
          ? purchase.paidAt.toDate().toISOString()
          : new Date().toISOString(),
      };
      filename = `Documento_Desmulta_${tokenData.caseData?.shortId || tokenData.purchaseId.slice(-8).toUpperCase()}.pdf`;
    } else if (refId) {
      // ── FLUJO 2: DESCARGA DIRECTA (PANTALLA DE CONFIRMACIÓN) ──
      const downloadToken = searchParams.get('downloadToken');
      if (!downloadToken || downloadToken.trim() === '') {
        logger.security(
          '[documentos/download] Intento de descarga sin token de descarga (IDOR bloqueado)',
          { refId }
        );
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
            providedToken: downloadToken,
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
      const ip = req.headers.get('x-forwarded-for') || 'Unknown IP';
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

    return new NextResponse(fileBytes as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logger.error('[documentos/download] Error generando PDF de descarga:', {
      error: String(error),
    });
    return new NextResponse('Error Interno del Servidor', { status: 500 });
  }
}
