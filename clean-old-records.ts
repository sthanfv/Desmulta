import { getAdminApp } from './src/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function cleanOldRecords() {
  const db = getFirestore(getAdminApp());
  
  // 30 días en milisegundos
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  
  // Opción 1: Borrar inactivos desde hace 30 días
  // Pero como es un sistema beta y quieres que dure 30 días la suscripción,
  // la lógica sería: borrar o desactivar los que se crearon hace más de 30 días.
  // Vamos a buscar los que se crearon hace más de 30 días.
  
  const snapshot = await db
    .collection('simit_subscriptions')
    .where('createdAt', '<', thirtyDaysAgo)
    .get();
    
  if (snapshot.empty) {
    console.log('✅ No se encontraron registros con más de 30 días de antigüedad.');
    return;
  }
  
  console.log(`⚠️ Se encontraron ${snapshot.size} registros viejos (más de 30 días). Procediendo a limpiar...`);
  
  const batch = db.batch();
  let count = 0;
  
  snapshot.forEach(doc => {
    // Para no borrar de golpe, vamos a marcar como inactivo (isActive: false)
    // Opcionalmente se puede borrar con batch.delete(doc.ref);
    // Pero la mejor práctica es desactivarlo para guardar analíticas anónimas.
    // Si la orden es "limpieza", lo borramos permanentemente.
    batch.delete(doc.ref);
    count++;
  });
  
  await batch.commit();
  console.log(`✅ Se eliminaron permanentemente ${count} registros expirados.`);
}

cleanOldRecords().catch(console.error);
