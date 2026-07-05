import admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

// Inicializar Admin SDK usando credenciales de .env
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

async function createTestPurchases() {
  try {
    const approvedRef = 'DSM-TEST-APPROVED';
    const pendingRef = 'DSM-TEST-PENDING';

    const caseData = {
      infractorName: "Ciudadano de Prueba SIMIT",
      infractorId: "1090123456",
      licensePlate: "TST123",
      ticketNumber: "110010002233",
      antiguedad: "más de 3 años",
      estadoCoactivo: "NO",
      tipoInfraccion: "C29 (Exceso de velocidad)",
      ciudadEmision: "Bogotá D.C.",
      autoridadTransito: "Secretaría de Movilidad de Bogotá",
      direccionNotificacion: "Calle Falsa 123",
      shortId: "TEST12",
    };

    // 1. Crear compra APROBADA
    await db.collection('purchases').doc(approvedRef).set({
      id: approvedRef,
      wompiReference: approvedRef,
      productType: "peticion_general",
      productLabel: "Ciudadano de Prueba SIMIT — peticion_general",
      amountCop: 2500000,
      status: "APPROVED",
      customerEmail: "test-comprador@desmulta.online",
      caseData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      idempotencyKey: approvedRef,
      ipAddress: "127.0.0.1",
      isTest: true
    });

    // 2. Crear compra PENDIENTE
    await db.collection('purchases').doc(pendingRef).set({
      id: pendingRef,
      wompiReference: pendingRef,
      productType: "peticion_general",
      productLabel: "Ciudadano de Prueba SIMIT — peticion_general",
      amountCop: 2500000,
      status: "PENDING",
      customerEmail: "test-pendiente@desmulta.online",
      caseData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      idempotencyKey: pendingRef,
      ipAddress: "127.0.0.1",
      isTest: true
    });

    console.log("✅ Compras de prueba inyectadas correctamente en Firestore:");
    console.log(`\n1. COMPRA APROBADA (Para probar descarga y editor):`);
    console.log(`   Referencia: ${approvedRef}`);
    console.log(`   URL del Editor:       https://desmulta.online/documentos/editor/${approvedRef}`);
    console.log(`   URL de Confirmación:  https://desmulta.online/documentos/confirmacion?ref=${approvedRef}`);
    console.log(`   URL de Descarga PDF:  https://desmulta.online/api/documentos/download?ref=${approvedRef}`);

    console.log(`\n2. COMPRA PENDIENTE (Para probar la pantalla de carga/polling):`);
    console.log(`   Referencia: ${pendingRef}`);
    console.log(`   URL de Confirmación:  https://desmulta.online/documentos/confirmacion?ref=${pendingRef}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error insertando compras de prueba:", error);
    process.exit(1);
  }
}

createTestPurchases();
