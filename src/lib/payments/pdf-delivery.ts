/**
 * @file pdf-delivery.ts
 * @description Motor de entrega de documentos PDF post-pago.
 *
 * Responsabilidades:
 *   1. Obtener la plantilla legal correcta según el tipo de producto.
 *   2. Generar el PDF en memoria usando el motor `pdf-engine.ts`.
 *   3. Enviar el PDF al correo del cliente vía Resend.
 *   4. Crear un token de descarga temporal en Firestore (72h / 3 descargas).
 *   5. Marcar la compra como entregada en Firestore.
 *
 * SEGURIDAD:
 *   - Esta función es invocada exclusivamente desde `webhook-wompi/route.ts`
 *     DESPUÉS de validar la firma criptográfica de Wompi y confirmar APPROVED.
 *   - Se llama con `waitUntil()` de `@vercel/functions` para garantizar que
 *     Vercel no congele el contenedor antes de completar la entrega.
 *
 * HISTORIAL:
 *   - v1.0.0 (2026-06-21): Creación inicial.
 *   - v1.1.0 (2026-06-22): Corrección auditoría — se reemplaza `purchase: any`
 *     por `purchase: PurchaseDocument` para tipado estricto y seguridad en
 *     tiempo de compilación.
 */

import { generateMandatePDF, MandatePayload } from '@/lib/legal/pdf-engine';
import { DOCUMENT_TEMPLATES, DocumentType } from '@/lib/legal/document-templates';
import { resend } from '@/lib/resend';
import { FieldValue, Firestore } from 'firebase-admin/firestore';
import { randomBytes } from 'crypto';
import { PurchaseDocument } from '@/lib/payments/purchase-document.types';

/**
 * Genera el PDF del documento legal comprado y lo entrega al cliente.
 *
 * Esta función debe invocarse con `waitUntil()` en entornos Serverless (Vercel)
 * para evitar que el contenedor sea suspendido antes de completar la entrega.
 *
 * @param purchase - Documento de compra aprobado leído desde Firestore.
 *   Debe estar en estado `APPROVED`. Tipado estrictamente con `PurchaseDocument`.
 * @param db - Instancia del cliente de Firestore Admin para escrituras.
 * @throws Error si la plantilla del producto no existe o si falla el envío.
 *
 * @example
 * // En webhook-wompi/route.ts (llamada correcta con waitUntil):
 * import { waitUntil } from '@vercel/functions';
 * waitUntil(
 *   generarYEnviarPDF(purchase, db).catch((err) =>
 *     logger.error('[pdf-delivery] Fallo en entrega', { err: String(err) })
 *   )
 * );
 */
export async function generarYEnviarPDF(purchase: PurchaseDocument, db: Firestore): Promise<void> {
  const { productType, caseData, customerEmail, id: purchaseId } = purchase;

  // 1. Obtener la plantilla del documento legal (falla rápido si no existe)
  const template = DOCUMENT_TEMPLATES[productType as DocumentType];
  if (!template) {
    throw new Error(
      `[pdf-delivery] Plantilla no encontrada para el tipo de producto: "${productType}". ` +
        `Verifica que el productType en la compra coincide con DocumentType en document-templates.ts.`
    );
  }

  // 2. Construir el payload del motor PDF
  const payload: MandatePayload = {
    ...caseData,
    // ticketNumber es requerido en MandatePayload pero opcional en PurchaseCaseData.
    // Se usa cadena vacía como fallback; el motor PDF lo omite si está vacío.
    ticketNumber: caseData.ticketNumber ?? '',
    documentType: productType as DocumentType,
    operatorName: process.env.OPERATOR_LEGAL_NAME || 'SISTEMA AUTOMATIZADO DESMULTA',
    operatorId: process.env.OPERATOR_LEGAL_ID || '[NIT_NO_CONFIGURADO]',
    acceptedAt: new Date().toISOString(),
  };

  // 3. Generar el PDF en memoria (operación costosa — sincrónica por diseño)
  const pdfBytes = await generateMandatePDF(payload);
  const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

  // Sanitizar caseData para prevenir inyección HTML en correos (Fix A-6)
  const sanitizeHtml = (str: string) =>
    str.replace(
      /[&<>"']/g,
      (m) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m as never] || m
    );
  const safeCaseData = Object.fromEntries(
    Object.entries(caseData).map(([k, v]) => [k, typeof v === 'string' ? sanitizeHtml(v) : v])
  ) as typeof caseData;

  // 4. Enviar el PDF por email al cliente (Resend)
  await resend.emails.send({
    from: 'Desmulta <documentos@desmulta.online>',
    to: [customerEmail],
    subject: `Tu documento está listo: ${template.titulo}`,
    html: `
      <h1>Tu documento legal está adjunto</h1>
      <p>Estimado/a cliente,</p>
      <p>Adjunto encontrarás tu <strong>${template.titulo}</strong> generado por Desmulta.</p>
      <p><strong>Instrucciones:</strong> ${template.protocolo2213(safeCaseData).join(' ')}</p>
      <p>Si tienes dudas, escríbenos a contactodesmulta@protonmail.com</p>
    `,
    attachments: [
      {
        filename: `${template.nombreArchivo || 'Documento'}_${purchaseId}.pdf`,
        content: pdfBase64,
      },
    ],
  });

  // 5. Crear token de descarga para el portal (válido 72h, máx 3 descargas)
  // 🛡️ FIX H-16: NO guardar caseData en pdf_tokens (colección con allow get: if true).
  // El endpoint de descarga recupera caseData desde purchases/{purchaseId} vía Admin SDK.
  // Esto previene que cualquier poseedor del tokenId lea cédulas directamente desde el SDK cliente.
  const tokenId = randomBytes(24).toString('hex');
  await db
    .collection('pdf_tokens')
    .doc(tokenId)
    .set({
      purchaseId,
      productType,
      // ❌ ELIMINADO: caseData — recuperar desde purchases en el momento de la descarga
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      maxDownloads: 3,
      downloadCount: 0,
    });

  // 6. Marcar la compra como entregada
  await db.collection('purchases').doc(purchaseId).update({
    pdfDeliveredAt: FieldValue.serverTimestamp(),
  });
}
