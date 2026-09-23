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

  const transaction = data?.transaction;
  if (!transaction?.id || !transaction?.reference || !transaction?.status) {
    logger.warn('[webhook-wompi] Evento sin transacción válida');
    return NextResponse.json({ ok: true, ignored: true });
  }
  const transactionId: string = String(transaction.id);
  const reference: string = String(transaction.reference); // = wompiReference de create-order
  const status: string = String(transaction.status); // APPROVED | DECLINED | VOIDED | ERROR
  const amountConfirmadoPorWompi = Number(transaction.amount_in_cents);

  const db = getFirestore(getAdminApp());

  // ── Pasos 5-8: Idempotencia + validación + actualización en UNA transacción ──
  // [2026-09-22] FIX: antes processed_callbacks se creaba ANTES de procesar. Si el
  // update de la compra fallaba (timeout, cuota), el reintento de Wompi se trataba
  // como duplicado y el pago quedaba PENDING para siempre (cliente sin documento).
  // Ahora: si algo falla, no se escribe nada y se responde 500 → Wompi reintenta.
  // La llave incluye el status para no descartar un VOIDED posterior a un APPROVED.
  const callbackRef = db.collection('processed_callbacks').doc(`${transactionId}_${status}`);
  const purchaseRef = db.collection('purchases').doc(reference);

  type Outcome = 'duplicate' | 'not_found' | 'flagged' | 'ignored' | 'updated';
  let outcome: Outcome;
  let purchase: PurchaseDocument | undefined;

  try {
    ({ outcome, purchase } = await db.runTransaction(async (tx) => {
      const [cbSnap, pSnap] = await Promise.all([tx.get(callbackRef), tx.get(purchaseRef)]);
      if (cbSnap.exists) return { outcome: 'duplicate' as Outcome, purchase: undefined };

      const current = pSnap.data() as PurchaseDocument | undefined;
      const marker = {
        wompiTransactionId: transactionId,
        reference,
        result: status,
        processedAt: FieldValue.serverTimestamp(),
      };

      if (!current) {
        tx.create(callbackRef, { ...marker, note: 'reference_not_found' });
        return { outcome: 'not_found' as Outcome, purchase: undefined };
      }

      // 🚨 El monto (y la moneda) cobrados deben coincidir con la pre-orden server-side
      if (
        status === 'APPROVED' &&
        (amountConfirmadoPorWompi !== current.amountCop || transaction.currency !== 'COP')
      ) {
        tx.update(purchaseRef, {
          status: 'FLAGGED_AMOUNT_MISMATCH',
          wompiTransactionId: transactionId,
          flaggedDetails: {
            paidCents: amountConfirmadoPorWompi,
            expectedCents: current.amountCop,
            currency: String(transaction.currency ?? ''),
            flaggedAt: new Date(),
          },
        });
        tx.create(callbackRef, { ...marker, note: 'amount_mismatch' });
        return { outcome: 'flagged' as Outcome, purchase: current };
      }

      // No degradar una compra ya aprobada con un DECLINED/ERROR tardío (solo VOIDED revierte)
      if (current.status === 'APPROVED' && status !== 'VOIDED') {
        tx.create(callbackRef, { ...marker, note: 'already_approved' });
        return { outcome: 'ignored' as Outcome, purchase: current };
      }

      tx.update(purchaseRef, {
        status,
        wompiTransactionId: transactionId,
        ...(status === 'APPROVED' && { paidAt: FieldValue.serverTimestamp() }),
      });
      tx.create(callbackRef, marker);
      return { outcome: 'updated' as Outcome, purchase: current };
    }));
  } catch (err) {
    logger.error('[webhook-wompi] Fallo transaccional — se pide reintento a Wompi', {
      reference,
      transactionId,
      err: String(err),
    });
    return NextResponse.json({ error: 'retry' }, { status: 500 });
  }

  if (outcome === 'duplicate') {
    logger.info('[webhook-wompi] Webhook duplicado ignorado', { transactionId, status });
    return NextResponse.json({ ok: true, duplicate: true });
  }
  if (outcome === 'not_found') {
    logger.security('[webhook-wompi] Referencia inexistente en purchases', { reference });
    return NextResponse.json({ ok: true, ignored: true });
  }
  if (outcome === 'flagged') {
    logger.security('[webhook-wompi] 🚨 DISCREPANCIA DE MONTO — posible intento de fraude', {
      reference,
      transactionId,
      amountConfirmadoPorWompi,
      amountEsperado: purchase?.amountCop,
    });
    // Nota: se eliminó la escritura a banned_ips — ningún endpoint la consultaba.
    return NextResponse.json({ ok: true, flagged: true });
  }
  if (outcome === 'ignored' || !purchase) {
    return NextResponse.json({ ok: true, ignored: true });
  }

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
        generarYEnviarPDF(purchase, db).catch((err: unknown) => {
          logger.error('[webhook-wompi] Fallo en entrega PDF — revisar sistema de reintentos', {
            reference,
            transactionId,
            err: String(err),
          });
        })
      );

      // 🔔 Notificación "Cha-ching!" por Telegram al dueño
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_DEV_CHAT_ID || process.env.TELEGRAM_CHAT_ID;

      if (botToken && chatId) {
        // Helper para escapar caracteres y evitar que Telegram devuelva 400 Bad Request
        const escapeHtml = (text: string) =>
          text.replace(
            /[&<>'"]/g,
            (tag) =>
              ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[tag] || tag
          );

        // Extraemos datos extra si existen en el documento de la compra
        const nombre = escapeHtml(purchase?.caseData?.infractorName || 'Cliente Anónimo');
        const producto = escapeHtml(purchase?.productLabel || 'Documento Legal');
        const ticketStr = purchase?.caseData?.ticketNumber
          ? `\n<b>Comparendo:</b> <code>${escapeHtml(purchase.caseData.ticketNumber)}</code>`
          : '';

        waitUntil(
          fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              parse_mode: 'HTML',
              text: `💰 <b>¡NUEVO PAGO RECIBIDO!</b> 💰\n\n<b>Cliente:</b> ${nombre}\n<b>Producto:</b> ${producto}${ticketStr}\n<b>Monto:</b> $${(amountConfirmadoPorWompi / 100).toLocaleString('es-CO')} COP\n<b>Ref:</b> <code>${reference}</code>\n\nEl PDF se está enviando automáticamente. 🚀`,
            }),
          })
            .then(async (res) => {
              if (!res.ok) {
                const errorBody = await res.text();
                logger.warn('[webhook-wompi] Telegram API rechazó el mensaje', { errorBody });
              }
            })
            .catch((err: unknown) => {
              logger.warn('[webhook-wompi] Fallo de red al enviar Telegram', {
                error: String(err),
              });
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
