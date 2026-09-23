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
      const tokenRef = db.collection('pdf_tokens').doc(tokenId);
      // 🛡️ FIX C-2: Control atómico de cuotas.
      // Usa db.runTransaction() para evitar Race Conditions si ocurren descargas concurrentes sobre el mismo token.
      const tokenResult = await db.runTransaction(async (tx) => {
        const tokenSnap = await tx.get(tokenRef);
        if (!tokenSnap.exists) return { ok: false, reason: 'not_found' };

        const data = tokenSnap.data();
        if (!data) return { ok: false, reason: 'not_found' };

        const expiresAt = data.expiresAt?.toDate
          ? data.expiresAt.toDate()
          : new Date(data.expiresAt);

        if (new Date() > expiresAt) {
          return { ok: false, reason: 'expired' };
        }

        if (data.downloadCount >= data.maxDownloads) {
          return { ok: false, reason: 'limit_reached' };
        }

        tx.update(tokenRef, { downloadCount: FieldValue.increment(1) });
        return { ok: true, data };
      });

      if (!tokenResult.ok) {
        if (tokenResult.reason === 'not_found') {
          return new NextResponse('Enlace inválido o documento no encontrado', { status: 404 });
        }
        if (tokenResult.reason === 'expired') {
          return new NextResponse('El enlace de descarga ha expirado (límite 72 horas)', {
            status: 403,
          });
        }
        if (tokenResult.reason === 'limit_reached') {
          return new NextResponse(
            'Se ha alcanzado el límite máximo de descargas para este documento',
            { status: 403 }
          );
        }
      }

      const tokenData = tokenResult.data;
      if (!tokenData) {
        return new NextResponse('Error interno del servidor al leer token', { status: 500 });
      }
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
        // [2026-09-22] FIX: antes se imprimía un NIT ficticio ('NIT 900.000.000-1') en
        // documentos legales vendidos. Mismo origen que pdf-delivery.ts (correo).
        operatorName: process.env.OPERATOR_LEGAL_NAME || 'SISTEMA AUTOMATIZADO DESMULTA',
        operatorId: process.env.OPERATOR_LEGAL_ID || '[NIT_NO_CONFIGURADO]',
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

      const purchaseRef = db.collection('purchases').doc(refId);
      // 🛡️ FIX C-2: Control atómico de cuotas.
      // Usa db.runTransaction() para evitar Race Conditions (TOCTOU) si ocurren múltiples descargas concurrentes.
      const purchaseResult = await db.runTransaction(async (tx) => {
        const purchaseSnap = await tx.get(purchaseRef);
        if (!purchaseSnap.exists) return { ok: false, reason: 'not_found' };

        const data = purchaseSnap.data();
        if (!data) return { ok: false, reason: 'not_found' };

        // Validar el token de descarga
        const expected = Buffer.from(data.downloadToken || '');
        const provided = Buffer.from(downloadToken || '');
        const isLengthOk = expected.length === provided.length;
        const isTokenValid = isLengthOk && timingSafeEqual(expected, provided);

        if (!isTokenValid) return { ok: false, reason: 'invalid_token' };
        if (data.status !== 'APPROVED') return { ok: false, reason: 'not_approved' };

        const expiresAt = data.downloadTokenExpiresAt?.toDate
          ? data.downloadTokenExpiresAt.toDate()
          : data.downloadTokenExpiresAt
            ? new Date(data.downloadTokenExpiresAt)
            : null;

        if (expiresAt && new Date() > expiresAt) return { ok: false, reason: 'expired' };

        const downloadCount = data.downloadCount || 0;
        const maxDownloads = data.maxDownloads || 5;
        if (downloadCount >= maxDownloads) return { ok: false, reason: 'limit_reached' };

        tx.update(purchaseRef, { downloadCount: FieldValue.increment(1) });
        return { ok: true, data };
      });

      if (!purchaseResult.ok) {
        if (purchaseResult.reason === 'not_found') {
          return new NextResponse('Compra no encontrada', { status: 404 });
        }
        if (purchaseResult.reason === 'invalid_token') {
          logger.security(
            '[documentos/download] Intento de descarga con token inválido (IDOR bloqueado)',
            { refId }
          );
          return new NextResponse('No autorizado. Token de descarga inválido.', { status: 401 });
        }
        if (purchaseResult.reason === 'not_approved') {
          return new NextResponse(
            'El pago no ha sido aprobado. No se puede descargar el documento.',
            { status: 403 }
          );
        }
        if (purchaseResult.reason === 'expired') {
          return new NextResponse('El enlace de descarga ha expirado (límite 72 horas).', {
            status: 403,
          });
        }
        if (purchaseResult.reason === 'limit_reached') {
          return new NextResponse(
            'Se ha alcanzado el límite máximo de descargas para este documento.',
            { status: 403 }
          );
        }
      }

      const purchase = purchaseResult.data;
      if (!purchase) {
        return new NextResponse('Error interno al recuperar compra', { status: 500 });
      }

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
        // [2026-09-22] FIX: antes se imprimía un NIT ficticio ('NIT 900.000.000-1') en
        // documentos legales vendidos. Mismo origen que pdf-delivery.ts (correo).
        operatorName: process.env.OPERATOR_LEGAL_NAME || 'SISTEMA AUTOMATIZADO DESMULTA',
        operatorId: process.env.OPERATOR_LEGAL_ID || '[NIT_NO_CONFIGURADO]',
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
