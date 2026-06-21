import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger/security-logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reference, documentType } = body;

    if (!reference || !documentType) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for') || 'Unknown IP';
    const userAgent = req.headers.get('user-agent') || 'Unknown User-Agent';

    const db = getFirestore(getAdminApp());

    // Crear el log de auditoría
    await db.collection('audit_logs').add({
      type: 'DOWNLOAD',
      purchaseId: reference,
      documentType,
      timestamp: FieldValue.serverTimestamp(),
      ipAddress: ip,
      userAgent,
    });

    logger.info(`[audit] Download recorded`, { reference, documentType, ip });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error(`[audit] Failed to record download`, { error: String(error) });
    // Retornamos 200 de todos modos para no bloquear la experiencia del usuario,
    // pero el log interno queda guardado
    return NextResponse.json({ ok: false });
  }
}
