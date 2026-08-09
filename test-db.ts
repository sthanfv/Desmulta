import { getAdminApp } from './src/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { decryptData } from './src/lib/security/crypto';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function checkDb() {
  const db = getFirestore(getAdminApp());
  const snapshot = await db.collection('simit_subscriptions').get();
  
  console.log(`Encontradas ${snapshot.size} suscripciones.`);
  
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log({
      id: doc.id,
      email: data.encryptedEmail ? decryptData(data.encryptedEmail) : 'no-email',
      lastCheckedAt: data.lastCheckedAt,
      lastCheckedDate: data.lastCheckedAt ? new Date(data.lastCheckedAt).toLocaleString() : 'N/A',
      pushToken: data.pushToken ? data.pushToken.substring(0, 20) + '...' : 'NO_TOKEN',
      finesCount: data.lastKnownFinesCount,
    });
  });
}

checkDb().catch(console.error);
