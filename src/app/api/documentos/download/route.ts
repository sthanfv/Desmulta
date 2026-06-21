import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { generateMandatePDF, MandatePayload } from '@/lib/legal/pdf-engine';
import { DocumentType } from '@/lib/legal/document-templates';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ref = searchParams.get('ref');

    if (!ref) {
      return new NextResponse('Falta el parametro ref', { status: 400 });
    }

    const db = getFirestore(getAdminApp());
    const purchaseSnap = await db.collection('purchases').doc(ref).get();

    if (!purchaseSnap.exists) {
      return new NextResponse('Documento no encontrado', { status: 404 });
    }

    const purchase = purchaseSnap.data();

    if (purchase?.status !== 'APPROVED') {
      return new NextResponse('El pago aún no ha sido aprobado', { status: 403 });
    }

    const payload: MandatePayload = {
      ...purchase?.caseData,
      documentType: purchase?.productType as DocumentType,
      operatorName: 'SISTEMA AUTOMATIZADO DESMULTA',
      operatorId: 'NIT 900.000.000-1',
      acceptedAt: purchase?.paidAt
        ? purchase.paidAt.toDate().toISOString()
        : new Date().toISOString(),
    };

    const pdfBytes = await generateMandatePDF(payload);

    const filename = `Peticion_${purchase?.caseData?.licensePlate || 'General'}_${purchase?.caseData?.infractorId || ''}.pdf`;

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
