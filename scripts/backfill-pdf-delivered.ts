/**
 * [2026-09-22] Backfill único: marca pdfDeliveredAt = null en compras que no tienen
 * el campo, para que la DLQ (/api/qstash/dlq-pdf-delivery) pueda encontrarlas.
 * Imprime cuántas compras APROBADAS no tienen entrega registrada (revisar a mano).
 *
 * Uso (desde la raíz, con .env.local): npm run backfill:pdf
 * Añade --dry-run para solo contar sin escribir.
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const DRY_RUN = process.argv.includes('--dry-run');

function initAdmin() {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Faltan FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY');
  }
  return (
    getApps()[0] ?? initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
  );
}

async function main() {
  const db = getFirestore(initAdmin());
  const snap = await db.collection('purchases').get();
  let batch = db.batch();
  let pending = 0;
  let updated = 0;
  const approvedSinEntrega: string[] = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    if (!('pdfDeliveredAt' in data)) {
      if (data.status === 'APPROVED') approvedSinEntrega.push(doc.id);
      if (!DRY_RUN) {
        batch.update(doc.ref, { pdfDeliveredAt: null, deliveryRetries: data.deliveryRetries ?? 0 });
        pending++;
      }
      updated++;
    }
    if (pending === 450) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }
  if (pending > 0) await batch.commit();

  console.log(`Compras revisadas: ${snap.size}`);
  console.log(`${DRY_RUN ? '[dry-run] Se actualizarían' : 'Actualizadas'}: ${updated}`);
  console.log(`⚠️  APROBADAS sin entrega registrada: ${approvedSinEntrega.length}`);
  approvedSinEntrega.forEach((id) => console.log(`   - ${id}`));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
