import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

/**
 * retryFailedDeliveries — Reintento real de entregas de PDF fallidas.
 *
 * Se ejecuta cada 30 minutos y detecta compras en estado APPROVED cuyo
 * campo pdfDeliveredAt sea null, indicando que la entrega del PDF falló
 * durante el procesamiento del webhook de Wompi.
 *
 * \ud83d\udee1\ufe0f FIX H-17: Implementación real del reintento. Antes, esta función ejecutaba
 * solo un `console.log` y el cliente nunca recibía su documento.
 *
 * El reintento se delega al endpoint interno `/api/internal/retry-pdf-delivery`
 * de Next.js, que tiene acceso a todas las dependencias de entrega de PDFs
 * (generarYEnviarPDF, Resend, Firebase Admin, etc.) sin necesidad de
 * duplicar la lógica en el entorno de Cloud Functions.
 *
 * Requiere las variables de entorno:
 * - NEXT_APP_URL: URL base de la aplicación Next.js (ej: https://desmulta.online)
 * - INTERNAL_API_SECRET: Secreto compartido para autenticar llamadas internas
 */

const NEXT_APP_URL = process.env.NEXT_APP_URL || 'https://desmulta.online';
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;

export const retryFailedDeliveries = functions
  .runWith({
    timeoutSeconds: 540,
    memory: '512MB',
    secrets: ['INTERNAL_API_SECRET'],
  })
  .pubsub.schedule('every 30 minutes')
  .onRun(async () => {
    const db = admin.firestore();
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    // Buscar compras aprobadas sin PDF entregado, con más de 30 min desde el pago
    const pending = await db
      .collection('purchases')
      .where('status', '==', 'APPROVED')
      .where('pdfDeliveredAt', '==', null)
      .where('paidAt', '<', thirtyMinutesAgo)
      .limit(10) // Procesar de a 10 para no agotar el tiempo
      .get();

    if (pending.empty) {
      console.log('[retry] Sin entregas pendientes de reintentar.');
      return;
    }

    console.log(`[retry] Detectadas ${pending.size} entregas fallidas. Iniciando reintentos.`);

    if (!INTERNAL_API_SECRET) {
      console.error('[retry] INTERNAL_API_SECRET no configurado. Abortando reintentos.');
      return;
    }

    // 🛡️ FIX H-17: Reintento real vía endpoint interno de Next.js.
    // Se usa Promise.allSettled para procesar todos los intentos aunque alguno falle.
    const results = await Promise.allSettled(
      pending.docs.map(async (docSnap) => {
        const purchaseId = docSnap.id;

        const response = await fetch(
          `${NEXT_APP_URL}/api/internal/retry-pdf-delivery`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${INTERNAL_API_SECRET}`,
            },
            body: JSON.stringify({ purchaseId }),
            // 2 minutos máximo por intento para no agotar el timeout de la Cloud Function
            signal: AbortSignal.timeout(120_000),
          }
        );

        if (!response.ok) {
          const body = await response.text();
          throw new Error(`HTTP ${response.status}: ${body.substring(0, 200)}`);
        }

        console.log(`[retry] ✅ Entrega exitosa en reintento: ${purchaseId}`);
      })
    );

    // 🛡️ FIX H-17: Registrar los reintentos que sigan fallando para visibilidad operativa.
    const fallos = results.filter((r) => r.status === 'rejected');
    if (fallos.length > 0) {
      console.error(
        `[retry] ❌ ${fallos.length} reintento(s) fallido(s):`,
        fallos.map((f) => (f as PromiseRejectedResult).reason?.message)
      );
    }
  });
