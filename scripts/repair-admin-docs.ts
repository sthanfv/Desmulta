/**
 * Script de reparación de administradores de Desmulta.
 *
 * Crea el documento `admins/{uid}` en Firestore para los administradores
 * que tienen el Custom Claim `admin: true` en Firebase Auth pero cuyo
 * documento en Firestore no existe (causa del bug de bloqueo post-OTP).
 *
 * Uso: ts-node --skip-project -O "{\"module\":\"commonjs\"}" scripts/repair-admin-docs.ts
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Cargar variables de entorno desde .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const projectId   = process.env.FIREBASE_PROJECT_ID!;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL!;
const privateKey  = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌ FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL o FIREBASE_PRIVATE_KEY no están configuradas en .env');
  process.exit(1);
}

// Inicializar Firebase Admin (solo si no hay instancia activa)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

const auth = admin.auth();
const db   = admin.firestore();

async function repararAdmins() {
  console.log('🔍 Buscando cuentas con Custom Claim admin: true en Firebase Auth...\n');

  let pageToken: string | undefined;
  let reparados   = 0;
  let yaExistian  = 0;
  let revisados   = 0;

  do {
    const result = await auth.listUsers(1000, pageToken);

    for (const user of result.users) {
      if (user.customClaims?.admin !== true) continue;

      revisados++;
      const docRef = db.collection('admins').doc(user.uid);
      const doc    = await docRef.get();

      if (!doc.exists) {
        // ── Crear documento faltante ──────────────────────────────────────
        await docRef.set({
          email:     user.email ?? 'sin-email@desconocido.com',
          uid:       user.uid,
          grantedAt: admin.firestore.Timestamp.now(),
          disabled:  false,
        });
        console.log(`  ✅ CREADO  → admins/${user.uid}  (${user.email})`);
        reparados++;
      } else {
        const data = doc.data();
        if (data?.disabled === true) {
          // Cuenta marcada como deshabilitada pero con Custom Claim activo — inconsistencia
          console.log(`  ⚠️  INCONSISTENTE → admins/${user.uid} (${user.email}) tiene disabled:true pero Custom Claim admin:true`);
          console.log(`     → Reactivando en Firestore...`);
          await docRef.update({ disabled: false, reactivatedAt: admin.firestore.Timestamp.now() });
          reparados++;
        } else {
          console.log(`  ✓  OK       → admins/${user.uid}  (${user.email})`);
          yaExistian++;
        }
      }
    }

    pageToken = result.pageToken;
  } while (pageToken);

  console.log('\n────────────────────────────────────────────');
  console.log(`Admins revisados:   ${revisados}`);
  console.log(`Documentos creados/reparados: ${reparados}`);
  console.log(`Ya existían correctamente: ${yaExistian}`);
  console.log('────────────────────────────────────────────');

  if (reparados > 0) {
    console.log('\n✅ Reparación completada. Los admins afectados ya pueden acceder al panel.');
  } else {
    console.log('\nℹ️  Ningún documento necesitaba reparación.');
  }
}

repararAdmins().catch((err) => {
  console.error('❌ Error durante la reparación:', err);
  process.exit(1);
});
