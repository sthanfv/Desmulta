import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { generateMandateDOCX } from '@/lib/legal/docx-engine';
import { generateMandatePDF } from '@/lib/legal/pdf-engine';
import { jwtVerify } from 'jose';
import { logger } from '@/lib/logger/security-logger';
import { getTokens } from 'next-firebase-auth-edge/lib/next/tokens';

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
    return tokens.decodedToken.email ?? null;
  } catch {
    return null;
  }
}

async function verifyGodMode(request: NextRequest) {
  const token = request.cookies.get('admin-god-mode-token');
  if (!token) return false;

  try {
    const jwtSecret = process.env.GOD_MODE_JWT_SECRET;
    if (!jwtSecret) return false;
    const secret = new TextEncoder().encode(jwtSecret);
    await jwtVerify(token.value, secret);
    return true;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const isGodMode = await verifyGodMode(request);
  if (!isGodMode) {
    return new NextResponse('No autorizado. Se requiere Modo Dios.', { status: 401 });
  }

  const type = request.nextUrl.searchParams.get('type') || 'poder_especial';
  const format = request.nextUrl.searchParams.get('format') || 'docx';

  try {
    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);
    const adminEmail = (await verifyAdminAuth(request)) || 'admin_god_mode@desmulta.com';

    // Generar un Payload genérico (vacío)
    const genericPayload = {
      productType: type,
      authorityCity: '____________________',
      authorityName: '____________________',
      infractorName: '____________________',
      infractorId: '____________________',
      infractorIdCity: '____________________',
      infractorAddress: '____________________',
      infractorEmail: '____________________',
      infractorPhone: '____________________',
      plateNumber: '______',
      comparendos: ['____________________'],
      comparendoDate: '____________________',
      vehicleType: '____________________',
      shortId: 'CASE_GENERIC',
      caseId: 'CASE_GENERIC',
      ticketNumber: '____________________',
    };

    // Auditoría
    const { getSecureIp } = await import('@/lib/security/ip-utils');
    const ip = getSecureIp(request);
    await db.collection('audit_logs').add({
      adminEmail,
      action: 'CREATE',
      resource: 'Free_Template_Generation',
      details: { type, format, reason: 'Bypass de pasarela por el dueño' },
      ipAddress: ip,
      timestamp: Timestamp.fromDate(new Date()),
      expireAt: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    });

    logger.security(`[admin/generate-generic] MODO DIOS: ${adminEmail} generó plantilla gratis ${type} en ${format}`);

    if (format === 'pdf') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfBytes = await generateMandatePDF(genericPayload as any);
      return new NextResponse(Buffer.from(pdfBytes), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Plantilla_Generica_${type}.pdf"`,
        },
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const docxBytes = await generateMandateDOCX(genericPayload as any);
      return new NextResponse(Buffer.from(docxBytes), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="Plantilla_Generica_${type}.docx"`,
        },
      });
    }
  } catch (error) {
    logger.error('[admin/generate-generic] Error generando', { error: String(error) });
    return new NextResponse('Error interno', { status: 500 });
  }
}
