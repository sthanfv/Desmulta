require('dotenv').config({ path: '.env' });
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  })
});

const db = admin.firestore();
async function run() {
  const doc = await db.collection('purchases').doc('DSM-2d42533c-7b7b-468c-aaff-84e51898d80f').get();
  console.log("EXISTS:", doc.exists);
  if(doc.exists) {
    const data = doc.data();
    console.log("downloadToken:", data.downloadToken);
    console.log("createdAt:", data.createdAt ? data.createdAt.toDate().toISOString() : null);
    console.log("wompiReference:", data.wompiReference);
  }
  process.exit(0);
}
run();
