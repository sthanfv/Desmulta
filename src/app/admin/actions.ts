'use server';

import { put } from '@vercel/blob';
import { revalidatePath } from 'next/cache';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

export async function uploadImage(
  formData: FormData,
  fileKey: 'beforeImage' | 'afterImage'
): Promise<{ url: string } | { error: string }> {
  const file = formData.get(fileKey) as File;
  if (!file || file.size === 0) {
    return { error: 'No se ha seleccionado ningún archivo.' };
  }

  // Basic MIME type validation
  if (!file.type.startsWith('image/')) {
    return { error: 'El archivo seleccionado no es una imagen válida.' };
  }

  try {
    const blob = await put(file.name, file, {
      access: 'public',
      addRandomSuffix: true, // Renombra la imagen para que sea única
    });

    // Revalidate the homepage to reflect the new image
    revalidatePath('/');

    return { url: blob.url };
  } catch (error) {
    console.error('Error al subir la imagen a Vercel Blob:', error);
    return { error: 'No se pudo subir la imagen.' };
  }
}

export async function deleteExpiredConsultations(): Promise<{
  success?: boolean;
  count?: number;
  error?: string;
}> {
  try {
    getAdminApp();
    const db = getFirestore();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const snapshot = await db
      .collection('consultations')
      .where('createdAt', '<=', Timestamp.fromDate(sevenDaysAgo))
      .get();

    if (snapshot.empty) {
      return { success: true, count: 0 };
    }

    const batch = db.batch();
    let count = 0;

    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
      count++;
    });

    await batch.commit();
    return { success: true, count };
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error ? error.message : 'Error interno al limpiar base de datos';
    console.error('[deleteExpiredConsultations] Error:', errorMsg);
    return { error: errorMsg };
  }
}

/**
 * Obtiene la lista de consultas desde Firestore
 */
export async function getConsultations() {
  try {
    getAdminApp();
    const db = getFirestore();

    const snapshot = await db
      .collection('consultations')
      .orderBy('createdAt', 'desc')
      .get();

    const consultations = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate()?.toISOString() || null,
        notifiedAt: data.notifiedAt?.toDate()?.toISOString() || null,
      };
    });

    return { success: true, data: consultations };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error al obtener consultas';
    console.error('[getConsultations] Error:', msg);
    return { success: false, error: msg };
  }
}
