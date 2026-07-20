import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getTokens } from 'next-firebase-auth-edge/lib/next/tokens';
import { generateMandatePDF } from '@/lib/legal/pdf-engine';
import { logger } from '@/lib/logger/security-logger';

async function verifyAdminAuth(request: NextRequest): Promise<string | null> {
  try {
    const tokens = await getTokens(request.cookies, {
      cookieName: '__session',
      cookieSignatureKeys: [
        process.env.AUTH_COOKIE_SIGNATURE_KEY_CURRENT || '',
        process.env.AUTH_COOKIE_SIGNATURE_KEY_PREVIOUS || '',
      ],
      serviceAccount: {
        projectId:
          process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      },
      apiKey:
        process.env.NEXT_PUBLIC_BASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    });

    if (!tokens) return null;

    const db = getFirestore();
    const adminDoc = await db.collection('admins').doc(tokens.decodedToken.uid).get();

    if (!adminDoc.exists || adminDoc.data()?.disabled) {
      return null;
    }

    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim());
    const userEmail = tokens.decodedToken.email ?? '';
    if (adminEmails.includes(userEmail)) {
      return userEmail;
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const adminEmail = await verifyAdminAuth(request);
  if (!adminEmail) {
    return new NextResponse('No autorizado.', { status: 401 });
  }

  const purchaseId = request.nextUrl.searchParams.get('purchaseId');
  if (!purchaseId) {
    return new NextResponse('Falta purchaseId', { status: 400 });
  }

  try {
    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);
    const purchaseSnap = await db.collection('purchases').doc(purchaseId).get();

    if (!purchaseSnap.exists) {
      return new NextResponse('Venta no encontrada', { status: 404 });
    }

    const purchaseData = purchaseSnap.data();
    if (!purchaseData) {
      return new NextResponse('Venta sin datos', { status: 404 });
    }

    if (purchaseData.status !== 'APPROVED') {
      return new NextResponse('Solo se pueden descargar ventas aprobadas.', { status: 403 });
    }

    // Registrar en auditoría
    const { getSecureIp } = await import('@/lib/security/ip-utils');
    const ip = getSecureIp(request);
    await db.collection('audit_logs').add({
      adminEmail,
      action: 'ACCESS',
      resource: 'Download_PDF',
      details: { purchaseId, reason: 'Re-descarga por operador' },
      ipAddress: ip,
      timestamp: Timestamp.fromDate(new Date()),
      expireAt: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    });

    logger.security(
      `[admin/download] Operador ${adminEmail} descargó PDF de la venta ${purchaseId}`
    );

    const payload = purchaseData.caseData;
    const pdfBytes = await generateMandatePDF(payload);

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Documento_Legal_${purchaseId}.pdf"`,
      },
    });
  } catch (error) {
    logger.error('[admin/download] Error generando PDF', { error: String(error) });
    return new NextResponse('Error interno', { status: 500 });
  }
}
