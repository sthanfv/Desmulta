import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Nota: En caso de que generarYEnviarPDF dependa de Next.js/React (PDF-lib),
// asegúrate de que el entorno de Cloud Functions tenga instaladas las dependencias (pdf-lib, resend, etc).
// O usa un endpoint interno en Next.js para disparar el reintento.

export const retryFailedDeliveries = functions
  .runWith({ timeoutSeconds: 540, memory: '512MB' })
  .pubsub.schedule('every 30 minutes')
  .onRun(async () => {
    const db = admin.firestore();
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    // Buscar compras aprobadas sin PDF entregado, más de 30 min
    const pending = await db.collection('purchases')
      .where('status', '==', 'APPROVED')
      .where('pdfDeliveredAt', '==', null)
      .where('paidAt', '<', thirtyMinutesAgo)
      .limit(10) // Procesar de a 10 para no agotar el tiempo
      .get();

    for (const doc of pending.docs) {
      try {
        // TODO: Llamar a la lógica de generarYEnviarPDF (ej. mediante llamada HTTP a Next.js o compartiendo el módulo)
        console.log('[retry] Reintento pendiente para:', doc.id);
      } catch (err) {
        console.error('[retry] Fallo reintento:', doc.id, err);
      }
    }
  });
