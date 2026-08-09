import { getAdminApp } from './src/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function deleteJunk() {
  const db = getFirestore(getAdminApp());
  
  const junkId = '88145123';
  await db.collection('simit_subscriptions').doc(junkId).delete();
  
  console.log(`Documento basura ${junkId} eliminado.`);
}

deleteJunk().catch(console.error);
