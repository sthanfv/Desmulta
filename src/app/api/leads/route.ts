import { NextResponse, NextRequest } from 'next/server';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';
import { SimitLeadSchema } from '@/lib/definitions';
import { logger } from '@/lib/logger/security-logger';
import { rateLimit } from '@/lib/security/rate-limit';

export async function POST(req: NextRequest) {
  // 1. Rate Limiting por IP (10 peticiones cada 15 min)
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const { success } = await rateLimit(`leads_${ip}`, 10, 15 * 60);

  if (!success) {
    logger.warn(`[API Leads] Rate limit excedido para IP: ${ip}`);
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Por favor, intenta de nuevo más tarde.' },
      { status: 429 }
    );
  }

  try {
    const rawBody = await req.json();

    // 2. Validación Zod
    const parsed = SimitLeadSchema.safeParse(rawBody);

    if (!parsed.success) {
      logger.warn(`[API Leads] Validación fallida: ${JSON.stringify(parsed.error.errors)}`);
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const leadData = parsed.data;

    // 3. Honeypot check (Prevención de bots)
    if (leadData.website_hp && leadData.website_hp.length > 0) {
      logger.warn(`[API Leads] Bot detectado (Honeypot llenado) desde IP: ${ip}`);
      // Respondemos OK para no dar feedback al bot
      return NextResponse.json({ id: 'bot-discarded' }, { status: 201 });
    }

    // Limpiamos honeypot antes de guardar
    const { website_hp: _website_hp, ...cleanLeadData } = leadData;

    // 4. Escribir en Firestore
    const app = getAdminApp();
    if (!app) {
      throw new Error('Firebase Admin no inicializado');
    }
    const db = getFirestore(app);

    const leadRef = db.collection('simit_leads').doc();
    const serverTimestamp = FieldValue.serverTimestamp();

    await leadRef.set({
      ...cleanLeadData,
      createdAt: serverTimestamp,
      ip_address: ip, // Guardamos la IP para análisis de fraude
      status: 'NEW',
    });

    logger.info(`[API Leads] Nuevo lead registrado exitosamente: ${leadRef.id}`);

    return NextResponse.json({ id: leadRef.id }, { status: 201 });
  } catch (error) {
    logger.error(`[API Leads] Error procesando lead: ${error}`);
    return NextResponse.json(
      { error: 'Error interno del servidor procesando el lead.' },
      { status: 500 }
    );
  }
}
