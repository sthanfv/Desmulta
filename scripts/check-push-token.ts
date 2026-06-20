import admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

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

async function checkToken() {
  const consultationId = 'TEST-9C9828E9';
  const pushSnap = await db.collection('consultations').doc(consultationId).collection('private').doc('push').get();
  
  if (pushSnap.exists) {
    console.log(`✅ Token Push encontrado: ${pushSnap.data()?.fcmToken}`);
  } else {
    console.log(`❌ No hay token Push guardado para el lead ${consultationId}`);
    
    // Check root doc just in case
    const leadSnap = await db.collection('consultations').doc(consultationId).get();
    if (leadSnap.data()?.fcmToken) {
        console.log(`✅ Token Push encontrado en la raíz del documento: ${leadSnap.data()?.fcmToken}`);
    }
  }
  process.exit(0);
}

checkToken();
