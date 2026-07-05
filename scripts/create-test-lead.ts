import admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config({ path: '.env' });

// Inicializar Admin SDK usando credenciales de .env
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Manejar saltos de línea en la clave privada
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

async function createTestLead() {
  try {
    const consultationId = 'TEST-' + crypto.randomUUID().slice(0, 8).toUpperCase();
    const shortId = consultationId;

    const leadData = {
      nombre: "Lead de Prueba E2E",
      emailContacto: "fv9316@proton.me",
      email: "fv9316@proton.me",
      contacto: "+573000000000",
      placa: "TST123",
      status: "nuevo", // Estado inicial
      cedula: "1000000000",
      shortId: shortId,
      trackingUuid: crypto.randomUUID(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      isTest: true,
      notas: "Este es un lead de prueba inyectado directamente a la BD para verificar triggers."
    };

    await db.collection('consultations').doc(consultationId).set(leadData);

    console.log(`✅ Lead de prueba insertado correctamente.`);
    console.log(`ID: ${consultationId}`);
    console.log(`Short ID: ${shortId}`);
    console.log(`Email configurado: ${leadData.emailContacto}`);
    console.log(`\nVe al panel de administración, busca este Lead y muévelo a 'En Estudio', luego a 'En Trámite'.`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error insertando lead:", error);
    process.exit(1);
  }
}

createTestLead();
