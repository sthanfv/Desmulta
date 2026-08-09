import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';

export interface SimitSubscription {
  cedula: string;
  email: string; // A dónde enviar las notificaciones
  isActive: boolean;
  createdAt: number;
  lastCheckedAt?: number;
  lastKnownFinesCount?: number;
  lastKnownTotalAmount?: number;
}

const COLLECTION_NAME = 'simit_subscriptions';

/**
 * Obtiene todas las suscripciones activas para el scheduler
 */
export async function getActiveSubscriptions(): Promise<SimitSubscription[]> {
  const db = getFirestore(getAdminApp());
  const snapshot = await db
    .collection(COLLECTION_NAME)
    .where('isActive', '==', true)
    .get();

  return snapshot.docs.map((doc: QueryDocumentSnapshot) => doc.data() as SimitSubscription);
}

/**
 * Registra o actualiza una suscripción de un usuario
 */
export async function upsertSubscription(data: Omit<SimitSubscription, 'createdAt'> & { createdAt?: number }): Promise<void> {
  const db = getFirestore(getAdminApp());
  const docRef = db.collection(COLLECTION_NAME).doc(data.cedula);
  
  await docRef.set({
    ...data,
    createdAt: data.createdAt || Date.now(),
    updatedAt: Date.now(),
  }, { merge: true });
}

/**
 * Actualiza el estado después de una revisión exitosa del Scraper
 */
export async function updateSubscriptionAfterCheck(
  cedula: string, 
  finesCount: number, 
  totalAmount: number
): Promise<void> {
  const db = getFirestore(getAdminApp());
  await db.collection(COLLECTION_NAME).doc(cedula).update({
    lastCheckedAt: Date.now(),
    lastKnownFinesCount: finesCount,
    lastKnownTotalAmount: totalAmount,
    updatedAt: Date.now(),
  });
}
