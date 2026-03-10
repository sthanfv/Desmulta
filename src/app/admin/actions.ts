'use server';

import { revalidatePath } from 'next/cache';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { Consultation } from '@/lib/definitions';
import { ShowcaseConfig, FooterConfig } from '@/lib/site-config';

/**
 * Actualiza la configuración del componente Showcase (Tablero/Hero)
 * y fuerza la revalidación de la página principal.
 */
export async function updateShowcaseConfig(data: ShowcaseConfig) {
  try {
    getAdminApp();
    const db = getFirestore();
    const docRef = db.collection('site_config').doc('showcase');

    await docRef.set(data, { merge: true });

    // MANDATO-FILTRO: Sincronización de caché estática
    revalidatePath('/');
    revalidatePath('/admin');

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error al actualizar Showcase';
    console.error('[updateShowcaseConfig] Error:', msg);
    return { success: false, error: msg };
  }
}

/**
 * Actualiza la configuración institucional (Footer)
 * y fuerza la revalidación de la página principal.
 */
export async function updateFooterConfig(data: FooterConfig) {
  try {
    getAdminApp();
    const db = getFirestore();
    const docRef = db.collection('site_config').doc('footer');

    await docRef.set(data, { merge: true });

    // MANDATO-FILTRO: Sincronización de caché estática
    revalidatePath('/');
    revalidatePath('/admin');

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error al actualizar Footer';
    console.error('[updateFooterConfig] Error:', msg);
    return { success: false, error: msg };
  }
}
export async function uploadImage(
  formData: FormData,
  fileKey: string
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
    const { put } = await import('@vercel/blob');
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
 * Obtiene la lista de consultas desde Firestore con paginación
 */
export async function getConsultations(pageSize: number = 20, lastDocId?: string | null) {
  try {
    getAdminApp();
    const db = getFirestore();

    // 🛡️ LEY DEL LÍMITE ESTRICTO: Solo descargamos leads activos, bloqueando lecturas de DESCARTADOS
    // BUGFIX: Incluimos 'pendiente' y 'nuevo' porque el API guarda en diferentes variantes
    let query = db
      .collection('consultations')
      .where('status', 'in', [
        'pendiente',
        'nuevo',
        'contactado',
        'estudio',
        'en_proceso',
        'radicado',
      ])
      .orderBy('createdAt', 'desc')
      .limit(pageSize);

    if (lastDocId) {
      const lastDoc = await db.collection('consultations').doc(lastDocId).get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      }
    }

    const snapshot = await query.get();

    const consultations = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        // Serialización segura para Next.js Plain Objects - v5.13.0
        createdAt: data.createdAt?.toDate?.().toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.().toISOString() || null,
        notifiedAt: data.notifiedAt?.toDate?.().toISOString() || null,
      };
    });

    const lastVisible = snapshot.docs[snapshot.docs.length - 1];

    return {
      success: true,
      data: consultations,
      lastDocId: lastVisible ? lastVisible.id : null,
      hasMore: snapshot.docs.length === pageSize,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error al obtener consultas';
    console.error('[getConsultations] Error:', msg);
    return { success: false, error: msg };
  }
}

/**
 * Convierte un lead en un caso administrativo activo
 */
export async function convertToCase(lead: Consultation) {
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
          date: new Date(), // ✅ new Date() dentro de arrays — serverTimestamp() prohibido en arrays por Firebase
          description: 'Caso aperturado desde gestión de leads.',
          type: 'system',
        },
      ],
      documents: [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
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
 * Obtiene la lista de casos activos con paginación
 */
export async function getCases(pageSize: number = 20, lastDocId?: string | null) {
  try {
    getAdminApp();
    const db = getFirestore();

    // 🛡️ LEY DEL LÍMITE ESTRICTO: Solo casos legales en estado activo
    let query = db
      .collection('cases')
      .where('status', 'in', [
        'apertura',
        'documentacion',
        'estudio',
        'tramite',
        'resolucion',
        'radicado',
        'en_espera',
      ])
      .orderBy('createdAt', 'desc')
      .limit(pageSize);

    if (lastDocId) {
      const lastDoc = await db.collection('cases').doc(lastDocId).get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      }
    }

    const snapshot = await query.get();

    const cases = snapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
      createdAt: doc.data().createdAt?.toDate().toISOString(),
      updatedAt: doc.data().updatedAt?.toDate().toISOString(),
    }));

    const lastVisible = snapshot.docs[snapshot.docs.length - 1];

    return {
      success: true,
      data: cases,
      lastDocId: lastVisible ? lastVisible.id : null,
      hasMore: snapshot.docs.length === pageSize,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error al obtener casos';
    console.error('[getCases] Error:', msg);
    return { success: false, error: msg };
  }
}

/**
 * Actualiza el estado de un caso y añade un evento al historial
 */
export async function updateCaseStatus(caseId: string, newStatus: string, description: string) {
  try {
    getAdminApp();
    const db = getFirestore();
    const caseRef = db.collection('cases').doc(caseId);

    const event = {
      date: new Date(), // ✅ new Date() dentro de arrayUnion — serverTimestamp() prohibido en arrays por Firebase
      description,
      type: 'status_change',
    };

    await caseRef.update({
      status: newStatus,
      history: FieldValue.arrayUnion(event),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error al actualizar el caso';
    console.error('[updateCaseStatus] Error:', msg);
    return { success: false, error: msg };
  }
}

/**
 * Sube un documento vinculado a un caso
 */
export async function uploadCaseDocument(caseId: string, formData: FormData, documentName: string) {
  try {
    const result = await uploadImage(formData, 'document');
    const { url } = result as { url: string };
    if (!url) throw new Error('Error al subir el archivo');

    getAdminApp();
    const db = getFirestore();
    const caseRef = db.collection('cases').doc(caseId);

    const documentData = {
      name: documentName,
      url: url,
      uploadedAt: new Date(), // ✅ new Date() dentro de arrayUnion
    };

    const historyEvent = {
      date: new Date(), // ✅ new Date() dentro de arrayUnion — serverTimestamp() prohibido en arrays por Firebase
      description: `Documento añadido: ${documentName}`,
      type: 'document_added',
    };

    await caseRef.update({
      documents: FieldValue.arrayUnion(documentData),
      history: FieldValue.arrayUnion(historyEvent),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { success: true, url };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error al subir el documento';
    console.error('[uploadCaseDocument] Error:', msg);
    return { success: false, error: msg };
  }
}

/**
 * Elimina todas las capturas de SIMIT identificadas por el prefijo 'simit_cap_'
 */
export async function deleteSimitCaptures(): Promise<{
  success?: boolean;
  count?: number;
  error?: string;
}> {
  try {
    const { list, del } = await import('@vercel/blob');
    // Listar blobs con el prefijo específico
    const { blobs } = await list({ prefix: 'simit_cap_' });

    if (blobs.length === 0) {
      return { success: true, count: 0 };
    }

    // Extraer URLs para eliminar
    const urls = blobs.map((blob) => blob.url);

    // Eliminar en lote
    await del(urls);

    // Refrescar panel admin
    revalidatePath('/admin');

    return { success: true, count: urls.length };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al limpiar';
    console.error('[deleteSimitCaptures] Error:', msg);
    return { error: msg };
  }
}

/**
 * Actualiza el estado de una consulta (Lead)
 */
export async function updateConsultationStatus(id: string, newStatus: string) {
  try {
    getAdminApp();
    const db = getFirestore();
    const docRef = db.collection('consultations').doc(id);

    await docRef.update({
      status: newStatus,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Esto hace que la tabla se refresque sola sin F5
    revalidatePath('/admin');
    return { success: true };
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    return { error: 'No se pudo actualizar el estado' };
  }
}
