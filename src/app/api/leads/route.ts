import { NextResponse, NextRequest } from 'next/server';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';
import { SimitLeadSchema } from '@/lib/definitions';
import { logger } from '@/lib/logger/security-logger';
import { rateLimit } from '@/lib/security/rate-limit';
import { getNextOperator } from '@/lib/operator-assignment';

/**
 * Anonimiza una IP para cumplimiento Zero-PII antes de persistir.
 * IPv4: enmascara los dos últimos octetos. IPv6: solo los primeros 2 segmentos.
 */
function anonymizeIp(ip: string): string {
  if (ip.includes(':')) {
    const parts = ip.split(':');
    return parts.slice(0, 2).join(':') + ':x:x:x:x:x:x';
  }
  const parts = ip.split('.');
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.x.x`;
  return 'unknown';
}

export async function POST(req: NextRequest) {
  const { getSecureIp } = await import('@/lib/security/ip-utils');
  const rawIp = getSecureIp(req);

  // 2. Rate Limiting por IP anonimizada (10 peticiones cada 15 min)
  const { success, reset } = await rateLimit(`leads_${rawIp}`, 10, 15 * 60 * 1000);

  if (!success) {
    logger.warn(`[API Leads] Rate limit excedido para IP: ${anonymizeIp(rawIp)}`);
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Por favor, intenta de nuevo más tarde.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(reset / 1000)) },
      }
    );
  }

  try {
    const rawBody = await req.json();

    // 3. Validación Zod
    const parsed = SimitLeadSchema.safeParse(rawBody);

    if (!parsed.success) {
      logger.warn(`[API Leads] Validación fallida: ${JSON.stringify(parsed.error.errors)}`);
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const leadData = parsed.data;

    // 4. Honeypot check (Prevención de bots)
    if (leadData.website_hp && leadData.website_hp.length > 0) {
      logger.warn(`[API Leads] Bot detectado (Honeypot llenado) desde IP: ${anonymizeIp(rawIp)}`);
      // Respondemos 201 para no dar feedback al bot
      return NextResponse.json({ id: 'bot-discarded' }, { status: 201 });
    }

    // Limpiamos honeypot antes de guardar
    const { website_hp: _website_hp, ...cleanLeadData } = leadData;

    // 5. Escribir en Firestore con asignación Round-Robin
    const app = getAdminApp();
    if (!app) {
      throw new Error('Firebase Admin no inicializado');
    }
    const db = getFirestore(app);

    const leadRef = db.collection('simit_leads').doc();
    const serverTimestamp = FieldValue.serverTimestamp();
    
    // Cálculo de seguridad en el backend
    let deudaCalculada = 0;
    let ahorroCalculado = 0;
    if (cleanLeadData.monto_base && cleanLeadData.fecha_infraccion) {
      const { calcularMultaCompleta } = await import('@/lib/calculadora-legal');
      const resultado = await calcularMultaCompleta(cleanLeadData.monto_base, cleanLeadData.fecha_infraccion);
      deudaCalculada = resultado.financiero.valorTotalActual;
      ahorroCalculado = resultado.financiero.interesesAcumulados;
    }

    // 🔄 Transacción atómica: Round-Robin + escritura del lead
    await db.runTransaction(async (transaction) => {
      const assignment = await getNextOperator(transaction, db);

      transaction.set(leadRef, {
        ...cleanLeadData,
        deuda_total: deudaCalculada,
        ahorro_potencial: ahorroCalculado,
        createdAt: serverTimestamp,
        // ZERO-PII: solo se guarda IP anonimizada. Nunca la IP completa.
        ip_address_anon: anonymizeIp(rawIp),
        status: 'NEW',
        // Sistema de asignación automática de operadores
        ...(assignment.assignedTo
          ? {
              assignedTo: assignment.assignedTo,
              assignedToEmail: assignment.assignedToEmail,
            }
          : {}),
      });
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
