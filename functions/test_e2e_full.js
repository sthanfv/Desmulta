const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const admin = require('firebase-admin');

// Parse the private key properly (replace literal \n with actual newlines)
const privateKey = process.env.FIREBASE_PRIVATE_KEY 
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined;

if (!privateKey || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PROJECT_ID) {
  console.error("Missing Firebase Admin credentials in .env");
  process.exit(1);
}

admin.initializeApp({ 
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
  }),
  projectId: process.env.FIREBASE_PROJECT_ID 
});
const db = admin.firestore();

const https = require('https');

const WEBHOOK_URL = "https://telegramwebhook-sc6ryv5xpa-uc.a.run.app";
const SECRET_TOKEN = "telegram_webhook_secreto_local_12345";
const TEST_CEDULA = "TEST_CEDULA_12345";
const TEST_CONSULTA = "CONSULTA-TEST-001";
const TEST_LEAD = "LEAD-TEST-001";

async function runTest() {
  console.log("=== INICIANDO E2E TEST COMPLETO ===");
  
  // 1. Limpiar datos anteriores
  await db.collection('leads').doc(TEST_LEAD).delete().catch(()=>null);
  await db.collection('consultations').doc(TEST_CONSULTA).delete().catch(()=>null);
  
  const casesSnap = await db.collection('cases').where('consultationId', '==', TEST_CONSULTA).get();
  for (const doc of casesSnap.docs) {
    await doc.ref.delete();
  }

  // 2. Crear Lead (simulando OCR)
  console.log("Creando Lead...");
  await db.collection('leads').doc(TEST_LEAD).set({
    cedula: TEST_CEDULA,
    estado_gestion: 'NUEVO',
    total_deuda_acumulada: 1500000,
    multas_registradas: [
      { numero: "COMP-001", valor: 500000 },
      { numero: "COMP-002", valor: 1000000 }
    ],
    ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
  });

  // 3. Crear Consultation (simulando Formulario Web)
  console.log("Creando Consultation...");
  await db.collection('consultations').doc(TEST_CONSULTA).set({
    cedula: TEST_CEDULA,
    status: 'pendiente',
    nombre: "Test User",
    contacto: "573001234567",
    placa: "XYZ123",
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Esperar un poco a Firestore
  await new Promise(r => setTimeout(r, 2000));

  // 4. Hit webhook simulando Telegram ✅ Contactado
  console.log("Llamando al Webhook de Telegram...");
  const randomCbId = "test-callback-" + Date.now();
  
  const payload = JSON.stringify({
    update_id: 9999003,
    callback_query: {
      id: randomCbId,
      from: { id: 777000, first_name: "TestOperador" },
      message: {
        message_id: 8003,
        chat: { id: 123456789 },
        text: "💼 NUEVO PROSPECTO"
      },
      data: `estado_contactado_${TEST_CONSULTA}`
    }
  });

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Bot-Api-Secret-Token': SECRET_TOKEN,
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  await new Promise((resolve, reject) => {
    const req = https.request(WEBHOOK_URL, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`Webhook HTTP ${res.statusCode}: ${data}`);
        resolve();
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });

  // Esperar a que la función termine de procesar Firestore
  console.log("Esperando procesamiento...");
  await new Promise(r => setTimeout(r, 4000));

  // 5. Validar Resultados
  console.log("=== VERIFICANDO RESULTADOS EN FIRESTORE ===");
  
  const leadDoc = await db.collection('leads').doc(TEST_LEAD).get();
  const consDoc = await db.collection('consultations').doc(TEST_CONSULTA).get();
  const caseQuery = await db.collection('cases').where('consultationId', '==', TEST_CONSULTA).get();

  let failed = false;

  console.log(`Lead estado: ${leadDoc.data()?.estado_gestion}`);
  if (leadDoc.data()?.estado_gestion !== 'EN_PROCESO') failed = true;

  console.log(`Consultation estado: ${consDoc.data()?.status}`);
  if (consDoc.data()?.status !== 'contactado') failed = true;

  if (caseQuery.empty) {
    console.log("ERROR: No se creó el caso en 'cases'!");
    failed = true;
  } else {
    const caseData = caseQuery.docs[0].data();
    console.log(`Caso creado exitosamente: ${caseQuery.docs[0].id}`);
    console.log(`- status: ${caseData.status}`);
    console.log(`- totalDeuda heredada: ${caseData.totalDeuda}`);
    console.log(`- multas heredadas: ${caseData.multas?.length}`);
    
    if (caseData.totalDeuda !== 1500000) failed = true;
    if (caseData.status !== 'contactado') failed = true;
  }

  if (failed) {
    console.log("❌ TEST FALLIDO: Las aserciones no coinciden.");
    process.exit(1);
  } else {
    console.log("✅ TEST E2E PASADO CON EXITO!");
    process.exit(0);
  }
}

runTest().catch(console.error);
