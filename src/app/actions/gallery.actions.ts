'use server';

import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
export interface SuccessCase {
  id: string;
  title: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  createdAt: string;
  watermarked?: boolean;
}
import { logger } from '@/lib/logger/security-logger';

export async function getPublicSuccessCases(): Promise<SuccessCase[]> {
  try {
    getAdminApp();
    const db = getFirestore();
    const snapshot = await db
      .collection('success_cases')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<SuccessCase, 'id'>),
    }));
  } catch (error) {
    logger.error('[getPublicSuccessCases] Error al obtener los casos de éxito', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}
