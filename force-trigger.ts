import { getAdminApp } from './src/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function forceTrigger() {
  const db = getFirestore(getAdminApp());
  
  const docId = 'df89bd2bc72cb2203d799a4d24421f56fb608b9b30268aefc3521b1aea68009e';
  const docRef = db.collection('simit_subscriptions').doc(docId);
  
  await docRef.update({
    lastCheckedAt: 0,
    lastKnownFinesCount: -99, // Un valor imposible para forzar 'hasChanges' a true (0 !== -99)
    lastKnownTotalAmount: 0,
  });
  
  console.log(`Documento ${docId} modificado para forzar activación del Cron.`);
}

forceTrigger().catch(console.error);
