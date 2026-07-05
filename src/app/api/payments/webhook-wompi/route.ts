/**
 * @file webhook-wompi/route.ts
 * @description Receptor del webhook asíncrono de eventos de Wompi.
 *
 * REGISTRO EN WOMPI:
 *   URL producción: https://desmulta.online/api/payments/webhook-wompi
 *   Registrar en: https://dashboard.wompi.co → Configuración → Eventos
 *
 * FLUJO DE SEGURIDAD (en orden):
 *   1. Parsear el payload JSON.
 *   2. Validar la firma criptográfica dinámica de Wompi (HMAC-SHA256).
 *   3. Filtrar: solo procesar el evento `transaction.updated`.
 *   4. Idempotencia: verificar si el webhook ya fue procesado (colección
 *      `processed_callbacks`) para evitar dobles entregas.
 *   5. Marcar el webhook como procesado ANTES de cualquier operación (previene
 *      race conditions si Wompi re-envía simultáneamente).
 *   6. Actualizar el estado de la compra en Firestore (PENDING → APPROVED/DECLINED).
 *   7. Si fue APPROVED: lanzar la entrega del PDF con `waitUntil()`.
 *   8. Siempre responder HTTP 200 a Wompi (si no, reintentará hasta 10 veces).
 *
 * ENTREGA EN BACKGROUND (waitUntil):
 *   Se usa `waitUntil` de `@vercel/functions` para registrar la promesa de
 *   generación y envío del PDF con el runtime de Vercel. Esto GARANTIZA que
 *   el contenedor NO sea suspendido antes de completar la entrega, eliminando
 *   el bug crítico del patrón "fire-and-forget" (void promise) que podía dejar
 *   a usuarios sin su documento tras pagar.
 *
 * HISTORIAL:
 *   - v1.0.0 (2026-06-21): Implementación inicial con firma dinámica e idempotencia.
 *   - v1.1.0 (2026-06-21): Corrección de firma Wompi con properties dinámicas.
 *   - v1.2.0 (2026-06-22): CORRECCIÓN CRÍTICA — se reemplaza `void promise`
 *     (fire-and-forget) por `waitUntil()` para garantizar la entrega del PDF
 *     en entornos Serverless de Vercel. Auditoría forense 2026-06-22.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { waitUntil } from '@vercel/functions';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { generarYEnviarPDF } from '@/lib/payments/pdf-delivery';
import { logger } from '@/lib/logger/security-logger';
import { PurchaseDocument } from '@/lib/payments/purchase-document.types';

export async function POST(req: NextRequest) {
  // ── Paso 1: Parsear el payload JSON ────────────────────────────────────────
  const body = await req.text();
  let event;
  try {
    event = JSON.parse(body);
  } catch (_err) {
    return NextResponse.json({ error: 'JSON malformado' }, { status: 400 });
  }

  // ── Paso 2: Validar estructura mínima del evento ───────────────────────────
  if (
    !event ||
    !event.signature ||
    !Array.isArray(event.signature.properties) ||
    !event.signature.checksum ||
    !event.timestamp
  ) {
    logger.warn('[webhook-wompi] Evento malformado o sin propiedades de firma');
    return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
  }

  // ── Paso 3: Reconstruir y validar la firma criptográfica de Wompi ──────────
  // Wompi Docs: concatenar los valores en el orden exacto de signature.properties,
  // luego añadir el timestamp y el secreto de eventos al final.
  let concatenatedValues = '';
  for (const prop of event.signature.properties) {
    const parts = prop.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let val: any = event.data;
    for (const part of parts) {
      if (val === undefined || val === null) break;
      val = val[part];
    }
    // String() convierte números (ej. monto = 0) correctamente sin omitirlos
    if (val !== undefined && val !== null) {
      concatenatedValues += String(val);
    }
  }

  // Agregar timestamp y el secreto de eventos al final de la cadena
  const eventsSecret = process.env.WOMPI_EVENTS_SECRET;
  if (!eventsSecret) {
    logger.error('[webhook-wompi] WOMPI_EVENTS_SECRET no configurada — abortando');
    return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
  }
  concatenatedValues += String(event.timestamp) + eventsSecret;

  const expectedSignature = createHash('sha256').update(concatenatedValues).digest('hex');

  if (event.signature.checksum !== expectedSignature) {
    logger.warn('[webhook-wompi] Firma inválida — checksum no coincide', {
      recibido: event.signature.checksum,
      esperado: expectedSignature,
    });
    return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
  }

  const { event: eventType, data } = event;

  // ── Paso 4: Filtrar — solo procesar transacciones actualizadas ─────────────
  if (eventType !== 'transaction.updated') {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const transaction = data.transaction;
  const transactionId = transaction.id;
  const reference = transaction.reference; // = wompiReference generado en create-order
  const status = transaction.status; // APPROVED | DECLINED | VOIDED

  const db = getFirestore(getAdminApp());

  // ── Paso 5: Idempotencia — evitar dobles entregas ──────────────────────────
  // Si Wompi envía el mismo evento más de una vez (comportamiento esperado),
  // lo ignoramos y respondemos 200 para que deje de reintentar.
  const callbackRef = db.collection('processed_callbacks').doc(transactionId);
  const alreadyProcessed = await callbackRef.get();

  if (alreadyProcessed.exists) {
    logger.info('[webhook-wompi] Webhook duplicado ignorado', { transactionId });
    return NextResponse.json({ ok: true, duplicate: true });
  }

  // ── Paso 6: Marcar como procesado ANTES de cualquier operación ────────────
  // Esto previene race conditions si Wompi envía el mismo webhook dos veces
  // de forma simultánea (ambos pasarían la verificación de idempotencia si
  // no se persiste primero).
  await callbackRef.set({
    wompiTransactionId: transactionId,
    processedAt: FieldValue.serverTimestamp(),
    result: status,
  });

  // ── Paso 7: Actualizar el estado de la compra en Firestore ─────────────────
  const purchaseRef = db.collection('purchases').doc(reference);
  await purchaseRef.update({
    status,
    wompiTransactionId: transactionId,
    ...(status === 'APPROVED' && { paidAt: FieldValue.serverTimestamp() }),
  });

  // ── Paso 8: Si fue APPROVED → entregar el PDF de forma segura ─────────────
  if (status === 'APPROVED') {
    const purchaseSnap = await purchaseRef.get();
    const purchase = purchaseSnap.data() as PurchaseDocument | undefined;

    if (purchase) {
      /**
       * CORRECCIÓN CRÍTICA (auditoría 2026-06-22):
       *
       * ANTES (incorrecto):
       *   void generarYEnviarPDF(purchase, db).catch(...)
       *   → Vercel podía suspender el contenedor inmediatamente después de
       *     devolver el NextResponse, dejando el PDF a medias y el usuario
       *     sin su documento, a pesar de haber pagado.
       *
       * AHORA (correcto):
       *   waitUntil(generarYEnviarPDF(purchase, db).catch(...))
       *   → waitUntil registra la promesa con el runtime de Vercel, que
       *     GARANTIZA mantener el contenedor activo hasta que la promesa
       *     se resuelva o rechace, antes de suspenderlo.
       *
       * Referencia: https://vercel.com/docs/functions/functions-api-reference#waituntil
       */
      waitUntil(
        generarYEnviarPDF(purchase, db).catch((err) => {
          logger.error('[webhook-wompi] Fallo en entrega PDF — revisar sistema de reintentos', {
            reference,
            transactionId,
            err: String(err),
          });
        })
      );
    }
  }

  // ── Paso 9: Responder 200 a Wompi ─────────────────────────────────────────
  // CRÍTICO: Siempre responder 200. Si Wompi no recibe 200, reintentará el
  // webhook hasta 10 veces con backoff exponencial, generando duplicados.
  return NextResponse.json({ ok: true, status });
}
