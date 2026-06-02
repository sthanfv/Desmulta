/**
 * 🛡️ Script de Migración ADR-001 Zero-PII
 *
 * Propósito: añadir `cedulaHash` y `contactoHash` a los documentos existentes
 * de la colección `consultations` en Firestore, sin borrar los campos originales.
 *
 * Ejecución (una sola vez):
 *   npx ts-node scripts/migrate-pii-hashes.ts
 */

import pkg from '@next/env';
const { loadEnvConfig } = pkg;
loadEnvConfig(process.cwd());

import crypto from 'crypto';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// ── Normalización de llave privada (Inmune a escapes y colapsos en 1 línea) ──
function normalizeKey(rawKey: string | undefined): string {
  if (!rawKey) return '';
  const keyStr = rawKey
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n');

  const pemRegex = /(-----BEGIN [A-Z ]+-----)([\s\S]*?)(-----END [A-Z ]+-----)/;
  const match = keyStr.match(pemRegex);

  if (match) {
    const header = match[1];
    const cleanBody = match[2].replace(/\s/g, '');
    const footer = match[3];
    const lines = cleanBody.match(/.{1,64}/g) ?? [];
    return `${header}\n${lines.join('\n')}\n${footer}\n`;
  }
  return keyStr;
}

// ── Inicialización Segura ───────────────────────────────────────────────────

if (!getApps().length) {
  const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = normalizeKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('❌ Faltan variables de entorno de Firebase Admin en .env');
  }

  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

const db = getFirestore();

// ── Función de hash (idéntica a server-crypto.ts) ───────────────────────────

function hashPII(value: string): string {
  const secret = process.env.PII_HMAC_SECRET;
  if (!secret) throw new Error('❌ PII_HMAC_SECRET no configurada.');
  return crypto.createHmac('sha256', secret).update(value.trim().toLowerCase()).digest('hex');
}

// ── Migración ───────────────────────────────────────────────────────────────

async function migrate() {
  console.log('🛡️  Iniciando migración ADR-001 Zero-PII…\n');

  const snapshot = await db.collection('consultations').get();
  console.log(`📦 Total de documentos: ${snapshot.size}`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  const BATCH_SIZE = 400;
  let batch = db.batch();
  let opsInBatch = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();

    if (data.cedulaHash && data.contactoHash) {
      skipped++;
      continue;
    }

    const cedula: string | undefined = data.cedula;
    const contacto: string | undefined = data.contacto;

    if (!cedula || !contacto) {
      console.warn(`  ⚠️  [${doc.id}] Sin cédula o contacto — omitiendo.`);
      errors++;
      continue;
    }

    try {
      batch.update(doc.ref, {
        cedulaHash: hashPII(cedula),
        contactoHash: hashPII(contacto),
      });
      opsInBatch++;
      updated++;

      if (opsInBatch >= BATCH_SIZE) {
        await batch.commit();
        console.log(`  ✅ Batch confirmado (${opsInBatch} docs).`);
        batch = db.batch();
        opsInBatch = 0;
      }
    } catch (err) {
      console.error(`  ❌ Error en [${doc.id}]:`, err);
      errors++;
    }
  }

  if (opsInBatch > 0) {
    await batch.commit();
    console.log(`  ✅ Batch final confirmado (${opsInBatch} docs).`);
  }

  console.log('\n── Resumen ──────────────────────────────────');
  console.log(`  ✅ Actualizados : ${updated}`);
  console.log(`  ⏭️  Omitidos     : ${skipped} (ya tenían hash)`);
  console.log(`  ❌ Errores      : ${errors}`);
  console.log('─────────────────────────────────────────────\n');

  if (errors > 0) {
    console.warn('⚠️  Algunos documentos no se migraron. Revisa los errores arriba.');
    process.exit(1);
  } else {
    console.log('🎉 Migración completada sin errores.');
  }
}

migrate().catch((err) => {
  console.error('💥 Error fatal en la migración:', err);
  process.exit(1);
});
