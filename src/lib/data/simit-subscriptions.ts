import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { encryptData, decryptData, hashData } from '@/lib/security/crypto';

export interface SimitSubscription {
  cedula: string;
  email: string;
  isActive: boolean;
  createdAt: number;
  lastCheckedAt?: number;
  lastKnownFinesCount?: number;
  lastKnownTotalAmount?: number;
  pushToken?: string;
}

export interface SimitSubscriptionDoc {
  encryptedCedula: string;
  encryptedEmail: string;
  isActive: boolean;
  createdAt: number;
  lastCheckedAt?: number;
  lastKnownFinesCount?: number;
  lastKnownTotalAmount?: number;
  pushToken?: string;
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

  return snapshot.docs
    .filter((doc) => {
      const data = doc.data() as SimitSubscriptionDoc;
      return !!data.encryptedCedula && !!data.encryptedEmail;
    })
    .map((doc: QueryDocumentSnapshot) => {
      const data = doc.data() as SimitSubscriptionDoc;
      return {
        cedula: decryptData(data.encryptedCedula),
        email: decryptData(data.encryptedEmail),
        isActive: data.isActive,
        createdAt: data.createdAt,
        lastCheckedAt: data.lastCheckedAt,
        lastKnownFinesCount: data.lastKnownFinesCount,
        lastKnownTotalAmount: data.lastKnownTotalAmount,
        pushToken: data.pushToken,
      };
    });
}

/**
 * Extrae suscripciones que llevan más de 7 días sin revisarse
 */
export async function getDueSubscriptions(limitCount: number): Promise<SimitSubscription[]> {
  const db = getFirestore(getAdminApp());
  
  // 7 días en milisegundos
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

  const snapshot = await db
    .collection(COLLECTION_NAME)
    .where('isActive', '==', true)
    .where('lastCheckedAt', '<', sevenDaysAgo)
    .orderBy('lastCheckedAt', 'asc') // Los que llevan más tiempo esperando primero
    .limit(limitCount)
    .get();

  return snapshot.docs
    .filter((doc) => {
      const data = doc.data() as SimitSubscriptionDoc;
      return !!data.encryptedCedula && !!data.encryptedEmail;
    })
    .map((doc: QueryDocumentSnapshot) => {
      const data = doc.data() as SimitSubscriptionDoc;
      return {
        cedula: decryptData(data.encryptedCedula),
        email: decryptData(data.encryptedEmail),
        isActive: data.isActive,
        createdAt: data.createdAt,
        lastCheckedAt: data.lastCheckedAt,
        lastKnownFinesCount: data.lastKnownFinesCount,
        lastKnownTotalAmount: data.lastKnownTotalAmount,
        pushToken: data.pushToken,
      };
    });
}

/**
 * Registra o actualiza una suscripción de un usuario
 */
export async function upsertSubscription(data: Omit<SimitSubscription, 'createdAt'> & { createdAt?: number }): Promise<void> {
  const db = getFirestore(getAdminApp());
  
  // Hash unidireccional de la cédula para usar como ID del documento (Búsqueda anónima segura)
  const docId = hashData(data.cedula);
  const docRef = db.collection(COLLECTION_NAME).doc(docId);
  
  const docData: Partial<SimitSubscriptionDoc> = {
    encryptedCedula: encryptData(data.cedula),
    encryptedEmail: encryptData(data.email),
    isActive: data.isActive,
    createdAt: data.createdAt || Date.now(),
    lastCheckedAt: data.lastCheckedAt !== undefined ? data.lastCheckedAt : 0, // Asegurar un número para indexación ascendente
    lastKnownFinesCount: data.lastKnownFinesCount,
    lastKnownTotalAmount: data.lastKnownTotalAmount,
    pushToken: data.pushToken,
  };
  
  // Eliminar undefined para que Firestore no se queje (merge ignorará los vacíos pero los undefined explícitos lanzan error)
  Object.keys(docData).forEach(key => docData[key as keyof typeof docData] === undefined && delete docData[key as keyof typeof docData]);

  await docRef.set({
    ...docData,
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
  const docId = hashData(cedula);
  
  await db.collection(COLLECTION_NAME).doc(docId).update({
    lastCheckedAt: Date.now(),
    lastKnownFinesCount: finesCount,
    lastKnownTotalAmount: totalAmount,
    updatedAt: Date.now(),
  });
}
