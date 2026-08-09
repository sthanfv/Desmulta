import { getAdminApp } from './src/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function testPush() {
  const db = getFirestore(getAdminApp());
  const snapshot = await db.collection('simit_subscriptions').where('isActive', '==', true).get();
  
  if (snapshot.empty) {
    console.log('No active subscriptions found.');
    return;
  }

  const doc = snapshot.docs[0];
  const data = doc.data();
  const token = data.pushToken;

  if (!token) {
    console.log('No push token found in the subscription.');
    return;
  }

  console.log('Push Token length:', token.length);
  console.log('Sending test push notification...');

  try {
    const messaging = getMessaging(getAdminApp());
    const response = await messaging.send({
      token: token,
      notification: {
        title: '🚨 Test Notification',
        body: `Test push sent at ${new Date().toLocaleTimeString()}`,
      },
      webpush: {
        fcmOptions: {
          link: 'https://desmulta.online/escudo-simit'
        }
      }
    });
    console.log('Successfully sent message:', response);
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

testPush().catch(console.error);
