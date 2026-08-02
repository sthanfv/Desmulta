/**
 * @file dlq-pdf-delivery/route.ts
 * @description Cola de Mensajería de Letras Muertas (DLQ) para entrega de PDFs.
 *
 * PROPOSITO:
 *   Garantizar que ninguna compra aprobada se quede sin enviar su documento
 *   debido a fallos de red, timeouts del motor PDF o caídas de Resend durante
 *   el webhook original de Wompi.
 *
 * EJECUCIÓN (QStash):
 *   Configurar en panel de Upstash QStash:
 *   URL: https://desmulta.online/api/qstash/dlq-pdf-delivery
 *   Schedule: Cada 15 minutos en el panel de QStash
 *
 * SEGURIDAD:
 *   - Utiliza `verifySignatureAppRouter` de `@upstash/qstash/nextjs`.
 *   - Rechaza cualquier petición sin firma válida de QStash.
 *
 * LÓGICA DE REINTENTOS:
 *   Busca hasta 10 compras donde:
 *   - status == 'APPROVED'
 *   - pdfDeliveredAt == null
 *   - paidAt < (ahora - 15 minutos) [Para evitar colisiones con webhook en vivo]
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { waitUntil } from '@vercel/functions';
import { generarYEnviarPDF } from '@/lib/payments/pdf-delivery';
import { logger } from '@/lib/logger/security-logger';
import { PurchaseDocument } from '@/lib/payments/purchase-document.types';

// Constantes de seguridad y rendimiento
const MAX_RETRIES_PER_RUN = 10;
const GRACE_PERIOD_MINUTES = 15;
const MAX_DELIVERY_ATTEMPTS = 5; // Evita starvation por poison pills

async function handler(_req: NextRequest) {
  try {
    const app = getAdminApp();
    if (!app) {
      throw new Error('Firebase Admin no inicializado');
    }
    const db = getFirestore(app);

    // Calcular la fecha de corte (hace 15 minutos exactos)
    const cutoffDate = new Date();
    cutoffDate.setMinutes(cutoffDate.getMinutes() - GRACE_PERIOD_MINUTES);
    const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

    // Consultar compras atascadas
    // Requisitos: Aprobadas, no entregadas (sin pdfDeliveredAt) y que ya superaron
    // su ventana de gracia (paidAt < 15 mins ago).
    const snapshot = await db
      .collection('purchases')
      .where('status', '==', 'APPROVED')
      // Importante: Firestore index limit. 'pdfDeliveredAt' no existe si no se entregó.
      // Firestore soporta filtrar por inexistencia si usamos un query manual o si
      // hacemos la verificación posterior. Como Firestore es NoSQL, una forma eficiente
      // es pedir los APPROVED menores a cutoff, y luego filtrar en memoria los que
      // no tienen pdfDeliveredAt. Si la base crece, se requeriría índice compuesto.
      .where('paidAt', '<=', cutoffTimestamp)
      .orderBy('paidAt', 'asc')
      .limit(MAX_RETRIES_PER_RUN * 3) // Pedimos más por el filtrado en memoria
      .get();

    if (snapshot.empty) {
      logger.info('[dlq-pdf-delivery] Cola limpia. Ningún PDF pendiente de envío.');
      return NextResponse.json({ ok: true, processed: 0 });
    }

    const failedPurchases: PurchaseDocument[] = [];

    // Filtrar en memoria las que NO tienen el campo pdfDeliveredAt y no han superado el límite de reintentos
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as PurchaseDocument;
      if (!data.pdfDeliveredAt && (data.deliveryRetries || 0) < MAX_DELIVERY_ATTEMPTS) {
        failedPurchases.push(data);
      } else if (!data.pdfDeliveredAt && (data.deliveryRetries || 0) >= MAX_DELIVERY_ATTEMPTS) {
        logger.warn(
          `[dlq-pdf-delivery] Compra ${data.id} superó el límite de reintentos (${MAX_DELIVERY_ATTEMPTS}). Abandonando envío para evitar starvation.`
        );
      }
    });

    // Limitar al máximo por batch
    const batchToProcess = failedPurchases.slice(0, MAX_RETRIES_PER_RUN);

    if (batchToProcess.length === 0) {
      return NextResponse.json({ ok: true, processed: 0 });
    }

    logger.info(`[dlq-pdf-delivery] Iniciando reintento para ${batchToProcess.length} compras.`);

    // Enviar a la cola de waitUntil para ejecución garantizada y paralela
    const deliveryPromises = batchToProcess.map((purchase) => {
      return generarYEnviarPDF(purchase, db).catch((err: unknown) => {
        logger.error('[dlq-pdf-delivery] Fallo crónico en reintento de PDF', {
          purchaseId: purchase.id,
          reference: purchase.wompiReference,
          err: String(err),
        });

        // Incrementar el contador de reintentos para evitar poison pill starvation
        const currentRetries = purchase.deliveryRetries || 0;
        return db
          .collection('purchases')
          .doc(purchase.id)
          .update({
            deliveryRetries: currentRetries + 1,
          })
          .catch((updateErr) => {
            logger.error(
              `[dlq-pdf-delivery] Error al incrementar deliveryRetries para ${purchase.id}`,
              { error: String(updateErr) }
            );
          });
      });
    });

    waitUntil(Promise.allSettled(deliveryPromises));

    return NextResponse.json({
      ok: true,
      processed: batchToProcess.length,
    });
  } catch (error) {
    logger.error('[dlq-pdf-delivery] Error fatal en la DLQ', {
      error: String(error),
    });
    return NextResponse.json({ error: 'Error procesando la cola de reintentos.' }, { status: 500 });
  }
}

// 3. Exportar el handler envuelto en el middleware de seguridad de QStash
// Esto asegura que solo peticiones con firmas válidas (QSTASH_CURRENT_SIGNING_KEY) pasen.
export const GET = verifySignatureAppRouter(handler);
export const POST = verifySignatureAppRouter(handler);
