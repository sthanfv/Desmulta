import { generateMandatePDF, MandatePayload } from '@/lib/legal/pdf-engine';
import { DOCUMENT_TEMPLATES, DocumentType } from '@/lib/legal/document-templates';
import { resend } from '@/lib/resend';
import { FieldValue, Firestore } from 'firebase-admin/firestore';
import { randomBytes } from 'crypto';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generarYEnviarPDF(purchase: any, db: Firestore) {
  const { productType, caseData, customerEmail, id: purchaseId } = purchase;

  // 1. Obtener la plantilla del documento
  const template = DOCUMENT_TEMPLATES[productType as DocumentType];
  if (!template) throw new Error(`Plantilla no encontrada: ${productType}`);

  // 2. Generar el PDF en memoria
  const payload: MandatePayload = {
    ...caseData,
    documentType: productType as DocumentType,
    operatorName: 'SISTEMA AUTOMATIZADO DESMULTA',
    operatorId: 'NIT 900.000.000-1',
    acceptedAt: new Date().toISOString(),
  };

  const pdfBytes = await generateMandatePDF(payload);
  const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

  // 3. Enviar el PDF por email (Resend)
  await resend.emails.send({
    from: 'Desmulta <documentos@desmulta.online>',
    to: [customerEmail],
    subject: `Tu documento está listo: ${template.titulo}`,
    html: `
      <h1>Tu documento legal está adjunto</h1>
      <p>Estimado/a cliente,</p>
      <p>Adjunto encontrarás tu <strong>${template.titulo}</strong> generado por Desmulta.</p>
      <p><strong>Instrucciones:</strong> ${template.protocolo2213(caseData).join(' ')}</p>
      <p>Si tienes dudas, escríbenos a contactodesmulta@protonmail.com</p>
    `,
    attachments: [
      {
        filename: `${template.nombreArchivo || 'Documento'}_${purchaseId}.pdf`,
        content: pdfBase64,
      },
    ],
  });

  // 4. Crear token de descarga para el portal (válido 72h, máx 3 descargas)
  const tokenId = randomBytes(24).toString('hex');
  await db
    .collection('pdf_tokens')
    .doc(tokenId)
    .set({
      purchaseId,
      productType,
      caseData,
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      maxDownloads: 3,
      downloadCount: 0,
    });

  // 5. Marcar compra como entregada
  await db.collection('purchases').doc(purchaseId).update({
    pdfDeliveredAt: FieldValue.serverTimestamp(),
    downloadToken: tokenId,
  });
}
