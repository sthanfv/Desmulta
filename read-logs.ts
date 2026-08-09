import { getAdminApp } from './src/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function readLogs() {
  const db = getFirestore(getAdminApp());
  const snapshot = await db.collection('worker_logs').orderBy('timestamp', 'desc').limit(5).get();
  
  if (snapshot.empty) {
    console.log("No hay logs registrados en Firestore.");
    return;
  }
  
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`\n--- LOG ${new Date(data.timestamp).toLocaleString()} ---`);
    console.log(`Error: ${data.error}`);
    if (data.details) console.log(`Details: ${data.details}`);
    console.log(`Stack: ${data.stack?.split('\n').slice(0, 3).join('\n')}`);
  });
}

readLogs().catch(console.error);
