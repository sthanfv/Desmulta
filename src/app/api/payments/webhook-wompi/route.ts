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
 *   4. Idempotencia atómica: `create()` en `processed_callbacks` — si el doc ya
 *      existe (código 6), retorna 200 inmediatamente. Elimina la ventana de race
 *      condition del patrón anterior get()+set().
 *   5. (Unificado en paso 4 — ver descripción de idempotencia atómica).
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
 *   - v1.2.0 (2026-06-22): CORRECCIóN CRÍTICA — se reemplaza `void promise`
 *     (fire-and-forget) por `waitUntil()` para garantizar la entrega del PDF
 *     en entornos Serverless de Vercel. Auditoría forense 2026-06-22.
 *   - v1.3.0 (2026-07-16): Corrección de seguridad — idempotencia atómica.
 *     Se reemplaza get()+set() por create() atómico. Cierra race condition
 *     en entregas dobles simultáneas de Wompi.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
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
    let val: Record<string, unknown> | unknown = event.data;
    for (const part of parts) {
      if (val === undefined || val === null) break;
      val = (val as Record<string, unknown>)[part];
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

  // 🛡️ FIX V2-C1: Comparación en tiempo constante (timingSafeEqual).
  // El operador !== compara carácter por carácter y cortocircuita en el primer
  // mismatch, permitiendo que un atacante mida la latencia y reconstruya la firma
  // (timing attack). timingSafeEqual tarda siempre el mismo tiempo sin importar
  // cuántos caracteres coincidan.
  const receivedSig = String(event.signature.checksum || '');
  const signaturesMatch =
    receivedSig.length === expectedSignature.length &&
    timingSafeEqual(Buffer.from(receivedSig), Buffer.from(expectedSignature));

  if (!signaturesMatch) {
    // 🛡️ FIX V2-C1: NUNCA loguear la firma esperada ni la recibida.
    // Loguear ambas expondría el secreto en GCP Cloud Logging si los logs
    // son accedidos por un actor interno o en una brecha de acceso.
    logger.warn('[webhook-wompi] Firma inválida — checksum no coincide', {
      receivedLength: receivedSig.length,
      expectedLength: expectedSignature.length,
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

  // ── Pasos 5 y 6: Idempotencia ATÓMICA — evitar dobles entregas ─────────────
  // 🛡️ FIX: Se reemplaza la secuencia get()+set() por un único create() atómico.
  // Si Wompi envía el mismo evento en paralelo, dos instancias serverless pueden
  // pasar el get() simultáneamente antes de que ninguna escriba el set().
  // Con create(), Firestore garantiza que solo UNA instancia triunfa (escritura
  // exclusiva); la segunda recibe el código de error 6 (ALREADY_EXISTS) y retorna
  // 200 de inmediato, cerrando la ventana de race condition.
  const callbackRef = db.collection('processed_callbacks').doc(transactionId);
  try {
    await callbackRef.create({
      wompiTransactionId: transactionId,
      processedAt: FieldValue.serverTimestamp(),
      result: status,
    });
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 6 /* ALREADY_EXISTS — webhook duplicado */) {
      logger.info('[webhook-wompi] Webhook duplicado ignorado (idempotencia atómica)', { transactionId });
      return NextResponse.json({ ok: true, duplicate: true });
    }
    throw err;
  }

  // ── Paso 7: Obtener y validar el monto esperado de la compra ──────────────
  const purchaseRef = db.collection('purchases').doc(reference);
  const purchaseSnap = await purchaseRef.get();
  const purchase = purchaseSnap.data() as PurchaseDocument | undefined;

  if (!purchase) {
    logger.security('[webhook-wompi] Referencia inexistente en purchases', { reference });
    return NextResponse.json({ ok: true, ignored: true });
  }

  // 🛡️ FIX CRÍTICO: Validar que el monto que Wompi REALMENTE cobró coincide con
  // el precio server-side establecido al crear la pre-orden en Firestore.
  const amountConfirmadoPorWompi = Number(transaction.amount_in_cents);
  if (status === 'APPROVED' && amountConfirmadoPorWompi !== purchase.amountCop) {
    logger.security('[webhook-wompi] 🚨 DISCREPANCIA DE MONTO — posible intento de fraude', {
      reference,
      transactionId,
      amountConfirmadoPorWompi,
      amountEsperado: purchase.amountCop,
    });
    await purchaseRef.update({
      status: 'FLAGGED_AMOUNT_MISMATCH',
      wompiTransactionId: transactionId,
      flaggedDetails: {
        paidCents: amountConfirmadoPorWompi,
        expectedCents: purchase.amountCop,
        flaggedAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true, flagged: true });
  }

  // ── Paso 8: Actualizar el estado de la compra en Firestore ─────────────────
  await purchaseRef.update({
    status,
    wompiTransactionId: transactionId,
    ...(status === 'APPROVED' && { paidAt: FieldValue.serverTimestamp() }),
  });

  // ── Paso 9: Si fue APPROVED → entregar el PDF de forma segura ─────────────
  if (status === 'APPROVED') {
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

      // 🔔 Notificación "Cha-ching!" por Telegram al dueño
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      
      if (botToken && chatId) {
        // Extraemos datos extra si existen en el documento de la compra
        const nombre = purchase?.caseData?.infractorName || 'Cliente Anónimo';
        const producto = purchase?.productLabel || 'Documento Legal';
        const ticket = purchase?.caseData?.ticketNumber ? `\n*Comparendo:* \`${purchase.caseData.ticketNumber}\`` : '';

        waitUntil(
          fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              parse_mode: 'Markdown',
              text: `💰 *¡NUEVO PAGO RECIBIDO!* 💰\n\n*Cliente:* ${nombre}\n*Producto:* ${producto}${ticket}\n*Monto:* $${(amountConfirmadoPorWompi / 100).toLocaleString('es-CO')} COP\n*Ref:* \`${reference}\`\n\nEl PDF se está enviando automáticamente. 🚀`
            })
          }).catch(err => {
            logger.warn('[webhook-wompi] Fallo al enviar el Cha-ching por Telegram', { error: String(err) });
          })
        );
      }
    }
  }

  // ── Paso 9: Responder 200 a Wompi ─────────────────────────────────────────
  // CRÍTICO: Siempre responder 200. Si Wompi no recibe 200, reintentará el
  // webhook hasta 10 veces con backoff exponencial, generando duplicados.
  return NextResponse.json({ ok: true, status });
}
