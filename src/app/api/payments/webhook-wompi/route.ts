import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { generarYEnviarPDF } from '@/lib/payments/pdf-delivery';
import { logger } from '@/lib/logger/security-logger';

// IMPORTANTE: Registrar la URL del webhook en el Dashboard de Wompi:
// https://desmulta.online/api/payments/webhook-wompi

export async function POST(req: NextRequest) {
  // 1. Parsear el evento y verificar firma dinámica
  const body = await req.text();
  let event;
  try {
    event = JSON.parse(body);
  } catch (_err) {
    return NextResponse.json({ error: 'JSON malformado' }, { status: 400 });
  }

  if (!event || !event.signature || !Array.isArray(event.signature.properties) || !event.signature.checksum || !event.timestamp) {
    logger.warn('[webhook-wompi] Evento malformado o sin propiedades de firma');
    return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
  }

  // 2. Wompi Docs: concatenar los valores en el orden exacto de signature.properties
  let concatenatedValues = '';
  for (const prop of event.signature.properties) {
    const parts = prop.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let val: any = event.data;
    for (const part of parts) {
      if (val === undefined || val === null) break;
      val = val[part];
    }
    if (val !== undefined && val !== null) {
      concatenatedValues += String(val);
    }
  }

  // Agregar timestamp y el secreto al final de la cadena
  concatenatedValues += String(event.timestamp) + (process.env.WOMPI_EVENTS_SECRET || '');

  const expectedSignature = createHash('sha256')
    .update(concatenatedValues)
    .digest('hex');

  if (event.signature.checksum !== expectedSignature) {
    logger.warn('[webhook-wompi] Firma inválida — checksum no coincide', { 
      recibido: event.signature.checksum, 
      esperado: expectedSignature 
    });
    return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
  }

  const { event: eventType, data } = event;

  // Solo procesar eventos de transacciones completadas
  if (eventType !== 'transaction.updated') {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const transaction = data.transaction;
  const transactionId = transaction.id;
  const reference = transaction.reference; // = wompiReference que creamos
  const status = transaction.status; // APPROVED | DECLINED | VOIDED

  const db = getFirestore(getAdminApp());

  // 3. IDEMPOTENCIA — Verificar si ya procesamos este webhook
  const callbackRef = db.collection('processed_callbacks').doc(transactionId);
  const alreadyProcessed = await callbackRef.get();

  if (alreadyProcessed.exists) {
    logger.info('[webhook-wompi] Webhook duplicado ignorado', { transactionId });
    return NextResponse.json({ ok: true, duplicate: true }); // Responder 200 a Wompi
  }

  // 4. Marcar como procesado INMEDIATAMENTE (antes de cualquier operación)
  // Esto previene race conditions si Wompi envía el webhook dos veces simultáneamente
  await callbackRef.set({
    wompiTransactionId: transactionId,
    processedAt: FieldValue.serverTimestamp(),
    result: status,
  });

  // 5. Actualizar el estado de la compra en Firestore
  const purchaseRef = db.collection('purchases').doc(reference);
  await purchaseRef.update({
    status,
    wompiTransactionId: transactionId,
    ...(status === 'APPROVED' && { paidAt: FieldValue.serverTimestamp() }),
  });

  // 6. Si el pago fue aprobado, generar y entregar el PDF
  if (status === 'APPROVED') {
    const purchaseSnap = await purchaseRef.get();
    const purchase = purchaseSnap.data();

    if (purchase) {
      // Disparar la entrega en background — NO bloquear la respuesta a Wompi
      // Si esto falla, el sistema de reintentos lo recupera
      void generarYEnviarPDF(purchase, db).catch((err) => {
        logger.error('[webhook-wompi] Fallo en entrega PDF', { reference, err: String(err) });
      });
    }
  }

  // 7. SIEMPRE responder 200 a Wompi — nunca fallar aquí
  // Si Wompi no recibe 200, reintentará el webhook hasta 10 veces
  return NextResponse.json({ ok: true, status });
}
