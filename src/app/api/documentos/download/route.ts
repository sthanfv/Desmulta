import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { generateMandatePDF, MandatePayload } from '@/lib/legal/pdf-engine';
import { DocumentType } from '@/lib/legal/document-templates';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tokenId = searchParams.get('token');

    if (!tokenId) {
      return new NextResponse('Falta el parametro token', { status: 400 });
    }

    const db = getFirestore(getAdminApp());
    const tokenSnap = await db.collection('pdf_tokens').doc(tokenId).get();

    if (!tokenSnap.exists) {
      return new NextResponse('Enlace inválido o documento no encontrado', { status: 404 });
    }

    const tokenData = tokenSnap.data();

    if (!tokenData) {
      return new NextResponse('Datos de token no encontrados', { status: 404 });
    }

    // Verificar expiración
    const expiresAt = tokenData.expiresAt?.toDate ? tokenData.expiresAt.toDate() : new Date(tokenData.expiresAt);
    if (new Date() > expiresAt) {
      return new NextResponse('El enlace de descarga ha expirado (límite 72 horas)', { status: 403 });
    }

    // Verificar límite de descargas
    if (tokenData.downloadCount >= tokenData.maxDownloads) {
      return new NextResponse('Se ha alcanzado el límite máximo de descargas para este documento', { status: 403 });
    }

    // Incrementar contador de descargas
    await db.collection('pdf_tokens').doc(tokenId).update({
      downloadCount: FieldValue.increment(1)
    });

    // Obtener info adicional de purchase
    const purchaseSnap = await db.collection('purchases').doc(tokenData.purchaseId).get();
    const purchase = purchaseSnap.data();

    const payload: MandatePayload = {
      ...tokenData.caseData,
      documentType: tokenData.productType as DocumentType,
      operatorName: 'SISTEMA AUTOMATIZADO DESMULTA',
      operatorId: 'NIT 900.000.000-1',
      acceptedAt: purchase?.paidAt
        ? purchase.paidAt.toDate().toISOString()
        : new Date().toISOString(),
    };

    const pdfBytes = await generateMandatePDF(payload);

    const filename = `Peticion_${tokenData.caseData?.licensePlate || 'General'}_${tokenData.caseData?.infractorId || ''}.pdf`;

    return new NextResponse(pdfBytes as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error generando descarga del PDF:', error);
    return new NextResponse('Error Interno del Servidor', { status: 500 });
  }
}
