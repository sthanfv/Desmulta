'use server';

import { put } from '@vercel/blob';
import { revalidatePath } from 'next/cache';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
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

/**
 * Convierte un lead en un caso administrativo activo
 */
export async function convertToCase(lead: any) {
  try {
    getAdminApp();
    const db = getFirestore();

    const caseId = `CASE-${Date.now()}`;
    const caseData = {
      id: caseId,
      consultationId: lead.id,
      cedula: lead.cedula,
      nombre: lead.nombre,
      contacto: lead.contacto,
      status: 'apertura',
      history: [
        {
          date: FieldValue.serverTimestamp(),
          description: 'Caso aperturado desde gestión de leads.',
          type: 'system'
        }
      ],
      documents: [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    // Usar transacción para asegurar atomicidad
    await db.runTransaction(async (transaction) => {
      const caseRef = db.collection('cases').doc(caseId);
      const leadRef = db.collection('consultations').doc(lead.id);

      transaction.set(caseRef, caseData);
      transaction.update(leadRef, { status: 'en_proceso' });
    });

    return { success: true, caseId };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error al convertir el lead';
    console.error('[convertToCase] Error:', msg);
    return { success: false, error: msg };
  }
}

/**
 * Obtiene la lista de casos activos
 */
export async function getCases() {
  try {
    getAdminApp();
    const db = getFirestore();
    const snapshot = await db.collection('cases')
      .orderBy('createdAt', 'desc')
      .get();

    const cases = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      createdAt: doc.data().createdAt?.toDate().toISOString(),
      updatedAt: doc.data().updatedAt?.toDate().toISOString(),
    }));

    return { success: true, data: cases };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error al obtener casos';
    console.error('[getCases] Error:', msg);
    return { success: false, error: msg };
  }
}
