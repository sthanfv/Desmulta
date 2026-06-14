'use server';
import { logger } from '@/lib/logger/security-logger';
import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdminSession } from '@/lib/auth/require-admin-session';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { decryptSymmetric, encryptSymmetric } from '@/lib/security/server-crypto';
import { Consultation } from '@/lib/definitions';
import { DocumentType } from '@/lib/legal/document-templates';
import { ShowcaseConfig, FooterConfig } from '@/lib/site-config';

/**
 * Actualiza la configuración del componente Showcase (Tablero/Hero)
 * y fuerza la revalidación de la página principal.
 */
export async function updateShowcaseConfig(idToken: string, data: ShowcaseConfig) {
  try {
    const decodedToken = await requireAdminSession(idToken);
    getAdminApp();
    const db = getFirestore();
    const docRef = db.collection('site_config').doc('showcase');

    await docRef.set(data, { merge: true });

    const { logAdminAction } = await import('@/app/admin/audit-actions');
    await logAdminAction({
      adminEmail: decodedToken.email || decodedToken.uid,
      action: 'UPDATE',
      resource: 'ShowcaseConfig',
      details: { ...data },
    });

    // MANDATO-FILTRO: Sincronización de caché estática
    revalidatePath('/');
    revalidatePath('/admin');

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error al actualizar Showcase';
    logger.error('[updateShowcaseConfig] Error', { error: msg });
    return { success: false, error: msg };
  }
}

/**
 * Actualiza la configuración institucional (Footer)
 * y fuerza la revalidación de la página principal.
 */
export async function updateFooterConfig(idToken: string, data: FooterConfig) {
  try {
    const decodedToken = await requireAdminSession(idToken);
    getAdminApp();
    const db = getFirestore();
    const docRef = db.collection('site_config').doc('footer');

    await docRef.set(data, { merge: true });

    const { logAdminAction } = await import('@/app/admin/audit-actions');
    await logAdminAction({
      adminEmail: decodedToken.email || decodedToken.uid,
      action: 'UPDATE',
      resource: 'FooterConfig',
      details: { ...data },
    });

    // MANDATO-FILTRO: Sincronización de caché estática
    revalidatePath('/');
    revalidatePath('/admin');

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error al actualizar Footer';
    logger.error('[updateFooterConfig] Error', { error: msg });
    return { success: false, error: msg };
  }
}
export async function uploadImage(
  idToken: string,
  formData: FormData,
  fileKey: string
): Promise<{ url: string } | { error: string }> {
  let decodedToken: DecodedIdToken | undefined;
  try {
    decodedToken = await requireAdminSession(idToken);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error de auth';
    return { error: msg };
  }
  const file = formData.get(fileKey) as File;
  if (!file || file.size === 0) {
    return { error: 'No se ha seleccionado ningún archivo.' };
  }
  if (file.size > 5 * 1024 * 1024) return { error: 'Máximo 5MB' };

  // Basic MIME type validation
  if (!file.type.startsWith('image/')) {
    return { error: 'El archivo seleccionado no es una imagen válida.' };
  }

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isWebp = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;

  if (!isJpeg && !isPng && !isWebp) {
    return { error: 'El archivo no es una imagen válida. Por favor usa JPG, PNG o WebP.' };
  }

  try {
    const { put } = await import('@vercel/blob');
    const blob = await put(file.name, file, {
      access: 'public',
      addRandomSuffix: true, // Renombra la imagen para que sea única
    });

    // Revalidate the homepage to reflect the new image
    revalidatePath('/');

    const { logAdminAction } = await import('@/app/admin/audit-actions');
    await logAdminAction({
      adminEmail: decodedToken.email || decodedToken.uid,
      action: 'CREATE',
      resource: 'ImageUpload',
      details: { fileKey, url: blob.url },
    });

    return { url: blob.url };
  } catch (error) {
    logger.error('Error al subir la imagen a Vercel Blob', { error });
    return { error: 'No se pudo subir la imagen.' };
  }
}

export async function deleteExpiredConsultations(idToken: string): Promise<{
  success?: boolean;
  count?: number;
  error?: string;
}> {
  try {
    const decodedToken = await requireAdminSession(idToken);
    getAdminApp();
    const db = getFirestore();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // 🛡️ PROTECCIÓN DE CASOS ACTIVOS: Solo borra leads descartados/pendientes/nuevos.
    // Jamás se deben eliminar casos en estado activo (estudio, en_proceso, radicado, etc.).
    const snapshot = await db
      .collection('consultations')
      .where('status', 'in', ['pendiente', 'nuevo', 'descartado'])
      .where('createdAt', '<=', Timestamp.fromDate(sevenDaysAgo))
      .limit(500)
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

    const { logAdminAction } = await import('@/app/admin/audit-actions');
    await logAdminAction({
      adminEmail: decodedToken.email || decodedToken.uid,
      action: 'DELETE',
      resource: 'ExpiredConsultations',
      details: { count },
    });

    return { success: true, count };
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error ? error.message : 'Error interno al limpiar base de datos';
    logger.error('[deleteExpiredConsultations] Error', { error: errorMsg });
    return { error: errorMsg };
  }
}

/**
 * Obtiene la lista de consultas desde Firestore con paginación
 */
export async function getConsultations(
  idToken: string,
  pageSize: number = 20,
  lastDocId?: string | null
) {
  try {
    await requireAdminSession(idToken);
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
        'descartado',
        'finalizado',
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
      const rawCedula = data.cedula || '';
      const cedula = rawCedula.startsWith('ENC:') ? decryptSymmetric(rawCedula) : rawCedula;
      return {
        ...data,
        id: doc.id,
        cedula,
        // Serialización segura para Next.js Plain Objects - v5.13.0
        createdAt: data.createdAt?.toDate?.().toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.().toISOString() || null,
        notifiedAt: data.notifiedAt?.toDate?.().toISOString() || null,
        retriedAt: data.retriedAt?.toDate?.().toISOString() || null,
        timeline_updates: (data.timeline_updates || []).map((event: Record<string, unknown>) => {
          const e = event as { date?: { toDate?: () => Date } };
          return {
            ...event,
            date: e.date?.toDate?.() ? e.date.toDate().toISOString() : e.date,
          };
        }),
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
    logger.error('[getConsultations] Error', { error: msg });
    return { success: false, error: msg };
  }
}

/**
 * Convierte un lead en un caso administrativo activo
 */
export async function convertToCase(
  idToken: string,
  lead: Consultation,
  forcedStatus?: string,
  customDb?: FirebaseFirestore.Firestore
) {
  try {
    let decodedToken: DecodedIdToken | undefined;
    // Si se provee un customDb (test mode), saltamos la sesión de admin
    if (!customDb) {
      decodedToken = await requireAdminSession(idToken);
      getAdminApp();
    }

    const db = customDb || getFirestore();

    const caseId = `EXPEDIENTE-${Date.now()}`;
    const targetStatus = forcedStatus || 'APERTURA';

    // 🛡️ HARDENING: Asegurar que ningún campo sea undefined para Firestore
    const safeAuthorUid = lead.authorUid || 'SYSTEM';
    // 🛡️ IDEMPOTENCIA: Si la cédula ya viene cifrada (ENC:...) de getConsultations(),
    // NO volver a cifrar. Esto previene doble encriptación ENC:ENC:...
    const rawCedula = lead.cedula || 'N/A';
    const safeCedula = rawCedula.startsWith('ENC:') ? rawCedula : encryptSymmetric(rawCedula);
    const safeNombre = lead.nombre || 'Sin Nombre';
    const safeContacto = lead.contacto || 'N/A';
    const safePlaca = lead.placa || 'N/A';

    logger.info('[convertToCase] Iniciando conversión', {
      leadId: lead.id,
      authorUid: safeAuthorUid,
    });

    const caseData = {
      id: caseId,
      consultationId: lead.id || 'N/A',
      authorUid: safeAuthorUid,
      cedula: safeCedula,
      nombre: safeNombre,
      contacto: safeContacto,
      placa: safePlaca,
      status: targetStatus,
      history: [
        {
          date: new Date(),
          description: 'Caso aperturado desde gestión de leads.',
          type: 'system' as const,
        },
      ],
      documents: [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Usar transacción para asegurar atomicidad
    await db.runTransaction(async (transaction: FirebaseFirestore.Transaction) => {
      const caseRef = db.collection('cases').doc(caseId);
      const leadRef = db.collection('consultations').doc(lead.id);

      // En el SDK de Admin, transaction.get() es asíncrono
      const leadSnap = await transaction.get(leadRef);
      const leadData = leadSnap.data();

      transaction.set(caseRef, caseData);
      transaction.update(leadRef, {
        status: 'terminado',
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Sincronizar vista materializada
      if (leadData?.trackingUuid) {
        const publicRef = db.collection('public_tracking').doc(leadData.trackingUuid);
        transaction.set(
          publicRef,
          {
            status: 'en_proceso',
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
    });

    if (!customDb && !decodedToken) {
      decodedToken = await requireAdminSession(idToken);
    }
    const { logAdminAction } = await import('@/app/admin/audit-actions');
    await logAdminAction({
      adminEmail: decodedToken?.email || decodedToken?.uid || 'SYSTEM',
      action: 'CREATE',
      resource: 'Case',
      details: { caseId, leadId: lead.id },
    });

    if (!customDb) {
      revalidateTag('tracking');
    }
    return { success: true, caseId };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error al convertir el lead';
    logger.error('[convertToCase] Error', { error: msg });
    return { success: false, error: msg };
  }
}

/**
 * Obtiene la lista de casos activos con paginación
 */
export async function getCases(idToken: string, pageSize: number = 20, lastDocId?: string | null) {
  try {
    await requireAdminSession(idToken);
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
        'finalizado',
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

    const cases = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        // Serialización segura de fechas raíz
        createdAt: data.createdAt?.toDate?.().toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.().toISOString() || null,
        // MANDATO-FILTRO: Saneamiento de arrays anidados sin 'any' para pasar ESLint
        history: (data.history || []).map((event: Record<string, unknown>) => {
          const e = event as { date?: { toDate?: () => Date } };
          return {
            ...event,
            date: e.date?.toDate?.() ? e.date.toDate().toISOString() : e.date,
          };
        }),
        documents: (data.documents || []).map((docObj: Record<string, unknown>) => {
          const d = docObj as { uploadedAt?: { toDate?: () => Date } };
          return {
            ...docObj,
            uploadedAt: d.uploadedAt?.toDate?.()
              ? d.uploadedAt.toDate().toISOString()
              : d.uploadedAt,
          };
        }),
      };
    });

    const lastVisible = snapshot.docs[snapshot.docs.length - 1];

    return {
      success: true,
      data: cases,
      lastDocId: lastVisible ? lastVisible.id : null,
      hasMore: snapshot.docs.length === pageSize,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error al obtener casos';
    logger.error('[getCases] Error', { error: msg });
    return { success: false, error: msg };
  }
}

/**
 * Actualiza el estado de un caso y añade un evento al historial
 */
export async function updateCaseStatus(
  idToken: string,
  caseId: string,
  newStatus: string,
  description: string,
  operatorNote?: string
) {
  try {
    const decodedToken = await requireAdminSession(idToken);
    getAdminApp();
    const db = getFirestore();
    const caseRef = db.collection('cases').doc(caseId);

    const _leadData = await db.runTransaction(async (transaction) => {
      // ==========================================
      // FASE 1: LECTURA AISLADA (SOLO GETs)
      // ==========================================
      const caseSnap = await transaction.get(caseRef);
      if (!caseSnap.exists) {
        throw new Error('El expediente principal (caso) no existe.');
      }
      const caseData = caseSnap.data();

      let leadRef = null;
      let publicRef = null;
      let currentLeadData: { fcmToken?: string; trackingUuid?: string } | undefined = undefined;

      // Si el caso tiene una consulta vinculada, la leemos ahora
      if (caseData?.consultationId) {
        leadRef = db.collection('consultations').doc(caseData.consultationId);
        const leadSnap = await transaction.get(leadRef);
        currentLeadData = leadSnap.data() as {
          fcmToken?: string;
          trackingUuid?: string;
          email?: string;
          nombre?: string;
        };

        // Si la consulta tiene un UUID de seguimiento, preparamos la referencia pública
        if (currentLeadData?.trackingUuid) {
          publicRef = db.collection('public_tracking').doc(currentLeadData.trackingUuid);
        }
      }

      // ==========================================
      // FASE 2: ESCRITURA AISLADA (SOLO UPDATE/SET)
      // ==========================================
      // A partir de este punto, queda prohibido usar transaction.get()

      const event = {
        date: new Date(),
        description,
        type: 'status_change',
        changedBy: decodedToken.uid,
        ...(operatorNote ? { operatorNote } : {}),
      };

      // 1. Actualizar el caso maestro
      transaction.update(caseRef, {
        status: newStatus,
        history: FieldValue.arrayUnion(event),
        updatedAt: FieldValue.serverTimestamp(),
        _lastOperatorEmail: decodedToken.email || decodedToken.uid,
      });

      // Mapeo de estados Legales a Públicos (Cero tecnicismos para el ciudadano)
      const publicStatusMap: Record<string, string> = {
        apertura: 'en_proceso',
        radicado: 'en_proceso',
        tramite: 'en_proceso',
        finalizado: 'terminado',
        terminado: 'terminado',
      };
      const publicStatus = publicStatusMap[newStatus.toLowerCase()] || 'en_proceso';

      // 2. Sincronizar con la consulta original (privada)
      if (leadRef) {
        transaction.update(leadRef, {
          status: publicStatus,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      // 3. Sincronizar con la vista materializada (pública)
      if (publicRef) {
        transaction.set(
          publicRef,
          {
            status: publicStatus,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      return currentLeadData;
    });

    revalidateTag('tracking'); // ⚡ Destruye el caché de la CDN instantáneamente

    // DESPACHO DE NOTIFICACIÓN PUSH — Directo y verificado
    // Se usa el dispatcher centralizado que busca el token en la subcolección
    // private/push y en el campo raíz del documento (retrocompatibilidad).
    if (caseId) {
      try {
        const { dispatchPush } = await import('@/lib/notifications/notification-dispatcher');
        const { STATUS_TEMPLATES } = await import('@/lib/notifications/push-notifications');
        const templateFn =
          STATUS_TEMPLATES[newStatus.toLowerCase() as keyof typeof STATUS_TEMPLATES];
        if (templateFn) {
          const { title, body } = templateFn(caseId);
          const trackingUrl = _leadData?.trackingUuid
            ? `https://desmulta.online/seguir/${_leadData?.trackingUuid}`
            : undefined;
          // Fire-and-forget: no bloqueamos la respuesta al admin por las notificaciones
          dispatchPush(caseId, { title, body, url: trackingUrl }, 'cases').catch((e) =>
            logger.warn('[updateCaseStatus] Fallo al despachar push (no crítico)', {
              error: e?.message,
            })
          );
        }
      } catch (pushErr) {
        logger.warn('[updateCaseStatus] Error al importar dispatcher (no crítico)', {
          error: pushErr instanceof Error ? pushErr.message : 'Error desconocido',
        });
      }
    }

    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al actualizar el caso';
    logger.error('[updateCaseStatus] Error', { error: msg });
    return { error: msg };
  }
}

/**
 * Sube un documento vinculado a un caso
 */
export async function uploadCaseDocument(
  idToken: string,
  caseId: string,
  formData: FormData,
  documentName: string
) {
  try {
    const result = await uploadImage(idToken, formData, 'document');
    const { url } = result as { url: string };
    if (!url) throw new Error('Error al subir el archivo');

    getAdminApp();
    const db = getFirestore();
    const caseRef = db.collection('cases').doc(caseId);

    const documentData = {
      name: documentName,
      url: url,
      uploadedAt: Timestamp.now(), // ✅ Timestamp.now() dentro de arrayUnion
    };

    const historyEvent = {
      date: Timestamp.now(), // ✅ Timestamp.now() dentro de arrayUnion
      description: `Documento añadido: ${documentName}`,
      type: 'document_added',
    };

    await caseRef.update({
      documents: FieldValue.arrayUnion(documentData),
      history: FieldValue.arrayUnion(historyEvent),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const decodedToken = await requireAdminSession(idToken);
    const { logAdminAction } = await import('@/app/admin/audit-actions');
    await logAdminAction({
      adminEmail: decodedToken.email || decodedToken.uid,
      action: 'UPDATE',
      resource: 'CaseDocument',
      details: { caseId, documentName },
    });

    return { success: true, url };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error al subir el documento';
    logger.error('[uploadCaseDocument] Error', { error: msg });
    return { success: false, error: msg };
  }
}

/**
 * Elimina todas las capturas de SIMIT identificadas por el prefijo 'simit_cap_'
 */
export async function deleteSimitCaptures(idToken: string): Promise<{
  success?: boolean;
  count?: number;
  error?: string;
}> {
  try {
    const decodedToken = await requireAdminSession(idToken);
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

    const { logAdminAction } = await import('@/app/admin/audit-actions');
    await logAdminAction({
      adminEmail: decodedToken.email || decodedToken.uid,
      action: 'DELETE',
      resource: 'SimitCaptures',
      details: { count: urls.length },
    });

    // Refrescar panel admin
    revalidatePath('/admin');

    return { success: true, count: urls.length };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al limpiar';
    logger.error('[deleteSimitCaptures] Error', { error: msg });
    return { error: msg };
  }
}

/**
 * Actualiza el estado de una consulta (Lead)
 */
export async function updateConsultationStatus(
  idToken: string,
  id: string,
  newStatus: string,
  operatorNote?: string
) {
  try {
    const decodedToken = await requireAdminSession(idToken);
    getAdminApp();
    const db = getFirestore();
    const docRef = db.collection('consultations').doc(id);

    const _leadData = await db.runTransaction(async (transaction) => {
      // FASE 1: LECTURA
      const leadSnap = await transaction.get(docRef);
      if (!leadSnap.exists) throw new Error('La consulta no existe.');
      const leadData = leadSnap.data();

      let publicRef = null;
      if (leadData?.trackingUuid) {
        publicRef = db.collection('public_tracking').doc(leadData.trackingUuid);
      }

      // FASE 2: ESCRITURA
      const timelineEvent = {
        date: new Date(),
        state: newStatus,
        systemMsg: `Actualización de flujo: ${newStatus}`,
        changedBy: decodedToken.uid,
        ...(operatorNote ? { operatorNote } : {}),
      };

      transaction.update(docRef, {
        status: newStatus,
        timeline_updates: FieldValue.arrayUnion(timelineEvent),
        updatedAt: FieldValue.serverTimestamp(),
        _lastOperatorEmail: decodedToken.email || decodedToken.uid,
      });

      if (publicRef) {
        transaction.set(
          publicRef,
          {
            status: newStatus,
            timeline_updates: FieldValue.arrayUnion(timelineEvent),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      return leadData;
    });

    // Esto hace que la tabla se refresque sola sin F5
    revalidatePath('/admin');
    revalidateTag('tracking'); // ⚡ Destruye el caché de la CDN instantáneamente

    // DESPACHO DE NOTIFICACIÓN PUSH — Directo y verificado
    try {
      const { dispatchPush } = await import('@/lib/notifications/notification-dispatcher');
      const { STATUS_TEMPLATES } = await import('@/lib/notifications/push-notifications');
      const templateFn = STATUS_TEMPLATES[newStatus.toLowerCase() as keyof typeof STATUS_TEMPLATES];
      if (templateFn) {
        const leadId = id;
        const { title, body } = templateFn(leadId, operatorNote);
        // Fire-and-forget: no bloquea la respuesta al admin
        dispatchPush(leadId, { title, body }, 'consultations').catch((e) =>
          logger.warn('[updateConsultationStatus] Fallo al despachar push (no crítico)', {
            error: e?.message,
          })
        );
      }
    } catch (pushErr) {
      logger.warn('[updateConsultationStatus] Error al importar dispatcher (no crítico)', {
        error: pushErr instanceof Error ? pushErr.message : 'Error desconocido',
      });
    }

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error al actualizar estado';
    logger.error('[updateConsultationStatus] Error', { error: msg });
    return { error: msg };
  }
}

/**
 * Genera el PDF del Poder Especial para un caso registrado.
 * Retorna el buffer en Base64 para descarga directa en el navegador.
 */
export async function generarPoderLegal(
  idToken: string,
  caseId: string,
  overrideData?: {
    nombre?: string;
    cedula?: string;
    email?: string;
    ticketNumber?: string;
    placa?: string;
  },
  documentType?: DocumentType,
  causalId?: string
): Promise<
  { success: true; base64: string; filename: string } | { success: false; error: string }
> {
  try {
    await requireAdminSession(idToken);
    getAdminApp();
    const db = getFirestore();

    // Busca primero en 'cases', luego en 'consultations'
    let docRef = db.collection('cases').doc(caseId);
    let docSnap = await docRef.get();

    if (!docSnap.exists) {
      docRef = db.collection('consultations').doc(caseId);
      docSnap = await docRef.get();
    }
    if (!docSnap.exists) {
      return { success: false, error: 'Caso no encontrado en la base de datos.' };
    }

    let data = docSnap.data()!;
    if (data.cedula && data.cedula.startsWith('ENC:')) {
      data.cedula = decryptSymmetric(data.cedula);
    }

    // Si hay edición manual Pre-PDF, persistimos la corrección en DB instantáneamente
    if (
      overrideData &&
      (overrideData.nombre ||
        overrideData.cedula ||
        overrideData.email ||
        overrideData.ticketNumber ||
        overrideData.placa)
    ) {
      const updatePayload: Record<string, string | FieldValue> = {
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (overrideData.nombre) updatePayload.nombre = overrideData.nombre;
      if (overrideData.cedula) updatePayload.cedula = encryptSymmetric(overrideData.cedula);
      if (overrideData.email) updatePayload.email = overrideData.email;
      if (overrideData.ticketNumber) updatePayload.ticketNumber = overrideData.ticketNumber;
      if (overrideData.placa) updatePayload.placa = overrideData.placa;

      await docRef.update(updatePayload);
      data = { ...data, ...updatePayload }; // Reflejar en memoria

      // Sincronizar Caché de la plataforma
      revalidatePath('/admin');
      revalidateTag('tracking');
    }

    const { generateMandatePDF } = await import('@/lib/legal/pdf-engine');
    const { extractSimitData } = await import('@/lib/utils/ocr-utils');

    // Extracción SIMIT Redundante (Backup por si el origen no inyectó OCR schema)
    const { extractedId, extractedName } = data.ocrData?.rawText
      ? extractSimitData(data.ocrData.rawText)
      : { extractedId: null, extractedName: null };

    const esSimitCaptura = data.cedula === 'SIMIT-CAPTURA';
    const nombreFinal = esSimitCaptura
      ? data.ocrData?.extractedName || extractedName || 'REVISAR EN SIMIT'
      : data.nombre || 'NO REGISTRADO';
    const cedulaFinal = esSimitCaptura
      ? data.ocrData?.extractedId || extractedId || 'REVISAR EN SIMIT'
      : data.cedula || 'NO REGISTRADO';

    const pdfBuffer = await generateMandatePDF({
      documentType:
        (documentType as import('@/lib/legal/document-templates').DocumentType) ||
        'peticion_general',
      causalId,
      antiguedad: data.antiguedad,
      estadoCoactivo: data.estadoCoactivo,
      tipoInfraccion: data.tipoInfraccion,
      infractorName: nombreFinal,
      infractorId: cedulaFinal,
      operatorName: process.env.DEFAULT_OPERATOR_NAME || 'Operador Desmulta',
      operatorId: process.env.DEFAULT_OPERATOR_ID || '000000000',
      ticketNumber: data.ticketNumber || 'POR_DEFINIR',
      licensePlate: data.placa || 'N/A',
      shortId: data.shortId || caseId.slice(0, 8).toUpperCase(),
      acceptedAt:
        data.createdAt instanceof Timestamp
          ? data.createdAt.toDate().toISOString()
          : data.createdAt || new Date().toISOString(),
      citizenEmail: data.email || '[correo no registrado]',
    });

    // Convertir Uint8Array a Base64 de forma directa en Node.js (Vercel Edge / Server)
    const base64 = Buffer.from(pdfBuffer).toString('base64');

    const docLabel = (documentType || 'Poder').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20);
    const filename = `${docLabel}_${(data.placa || cedulaFinal || caseId).replace(/[^a-zA-Z0-9]/g, '_')}_${data.shortId || ''}.pdf`;

    return { success: true, base64, filename };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error al generar el poder legal';
    logger.error('[generarPoderLegal] Error', { error: msg });
    return { success: false, error: msg };
  }
}

/**
 * TAREA 3: Funciones de Generación Aisladas
 * Genera el documento del Poder Especial.
 */
export async function buildPoderPDF(
  idToken: string,
  caseId: string,
  overrideData?: {
    nombre?: string;
    cedula?: string;
    email?: string;
    ticketNumber?: string;
    placa?: string;
  }
) {
  return generarPoderLegal(idToken, caseId, overrideData, 'poder_especial');
}

/**
 * TAREA 3: Funciones de Generación Aisladas
 * Genera el documento de Derecho de Petición u otra Acción Legal.
 */
export async function buildPeticionPDF(
  idToken: string,
  caseId: string,
  causalId: string,
  overrideData?: {
    nombre?: string;
    cedula?: string;
    email?: string;
    ticketNumber?: string;
    placa?: string;
  }
) {
  return generarPoderLegal(idToken, caseId, overrideData, 'peticion_general', causalId);
}

import { unstable_cache } from 'next/cache';

const getCachedAnalyticsStats = unstable_cache(
  async () => {
    getAdminApp();
    const db = getFirestore();

    // ── Lecturas en paralelo ──────────────────────────────────────────────────
    const [rawLeadsSnap, consultationsSnap, casesSnap] = await Promise.all([
      db.collection('leads').count().get(),
      db.collection('consultations').orderBy('createdAt', 'desc').limit(2000).get(),
      db.collection('cases').orderBy('createdAt', 'desc').limit(1000).get(),
    ]);

    const prospectosTotales = rawLeadsSnap.data().count;
    const totalLeads = consultationsSnap.size;
    const totalCases = casesSnap.size;

    const conversionGlobal =
      prospectosTotales > 0 ? ((totalCases / prospectosTotales) * 100).toFixed(1) : '0';
    const conversionRate = totalLeads > 0 ? ((totalCases / totalLeads) * 100).toFixed(1) : '0';

    // ── Crecimiento últimos 7 días ─────────────────────────────────────────────
    const now = new Date();
    const growthMap = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      growthMap.set(d.toISOString().split('T')[0], 0);
    }

    consultationsSnap.forEach((doc) => {
      const createdAt = doc.data().createdAt;
      if (createdAt && typeof createdAt.toDate === 'function') {
        const dateStr = createdAt.toDate().toISOString().split('T')[0];
        if (growthMap.has(dateStr)) {
          growthMap.set(dateStr, (growthMap.get(dateStr) || 0) + 1);
        }
      }
    });

    const growthData = Array.from(growthMap.entries()).map(([date, count]) => ({ date, count }));

    // ── Distribución de estados ───────────────────────────────────────────────
    const statusMap = new Map<string, number>();
    consultationsSnap.forEach((doc) => {
      const status = (doc.data().status || 'Otros').toUpperCase();
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });
    const statusData = Array.from(statusMap.entries()).map(([name, value]) => ({ name, value }));

    // ── Top 5 tipos de infracción ─────────────────────────────────────────────
    const infractionMap = new Map<string, number>();
    consultationsSnap.forEach((doc) => {
      const type = doc.data().tipoInfraccion || 'No especificado';
      infractionMap.set(type, (infractionMap.get(type) || 0) + 1);
    });
    const infractionData = Array.from(infractionMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));

    // ── Funnel Drop-off Telemetry ───────────────────────────────────────────────
    // Leemos la colección edge_telemetry para eventos funnel_step (últimos 30 días para no sobrecargar)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const edgeTelemetrySnap = await db
      .collection('edge_telemetry')
      .where('event', '==', 'funnel_step')
      .where('ts', '>=', thirtyDaysAgo.getTime())
      .orderBy('ts', 'desc')
      .limit(5000)
      .get();

    // Conteo por pasos (0: Placa/Cédula, 1: Contacto, 2: Pre-Análisis)
    let step0 = 0;
    let step1 = 0;
    let step2 = 0;

    edgeTelemetrySnap.forEach((doc) => {
      const { funnelStep } = doc.data();
      if (funnelStep === 0) step0++;
      if (funnelStep === 1) step1++;
      if (funnelStep === 2) step2++;
    });

    // Para el gráfico de embudo (Recharts FunnelChart)
    const funnelData = [
      { name: 'Paso 0: Inicio', value: step0, fill: '#8884d8' },
      { name: 'Paso 1: Contacto', value: step1, fill: '#82ca9d' },
      { name: 'Paso 2: Pre-Análisis', value: step2, fill: '#ffc658' },
      { name: 'Completados (Leads)', value: totalLeads, fill: '#ff8042' },
    ];

    // ── Tiempo promedio de resolución real ────────────────────────────────────
    // Calcula la diferencia real entre createdAt y updatedAt en casos finalizados.
    // Si no hay suficientes datos, muestra "N/A" en lugar de un número inventado.
    let averageResolutionTime = 'N/A';
    try {
      const resolvedCases = casesSnap.docs.filter((doc) => {
        const s = (doc.data().status || '').toLowerCase();
        return s === 'finalizado' || s === 'archivo' || s === 'terminado';
      });

      if (resolvedCases.length > 0) {
        const totalMs = resolvedCases.reduce((acc, doc) => {
          const data = doc.data();
          const created =
            typeof data.createdAt?.toDate === 'function' ? data.createdAt.toDate().getTime() : null;
          const updated =
            typeof data.updatedAt?.toDate === 'function' ? data.updatedAt.toDate().getTime() : null;

          if (created && updated && updated > created) {
            return acc + (updated - created);
          }
          return acc;
        }, 0);

        const validCount = resolvedCases.filter((doc) => {
          const d = doc.data();
          return (
            typeof d.createdAt?.toDate === 'function' &&
            typeof d.updatedAt?.toDate === 'function' &&
            d.updatedAt.toDate().getTime() > d.createdAt.toDate().getTime()
          );
        }).length;

        if (validCount > 0) {
          const avgDays = Math.round(totalMs / validCount / (1000 * 60 * 60 * 24));
          averageResolutionTime = `${avgDays} día${avgDays !== 1 ? 's' : ''}`;
        }
      }
    } catch {
      // Si falla el cálculo, N/A es mejor que un número inventado
      averageResolutionTime = 'N/A';
    }

    return {
      prospectosTotales,
      totalLeads,
      totalCases,
      conversionRate,
      conversionGlobal,
      averageResolutionTime, // ← ahora es real, no hardcodeado
      growthData,
      statusData,
      infractionData,
      funnelData,
    };
  },
  ['admin-analytics-stats'],
  { revalidate: 300, tags: ['analytics'] }
);

/**
 * Obtiene estadísticas analíticas para el dashboard administrativo.
 * Calcula métricas de conversión, crecimiento y distribución de expedientes.
 */
export async function getAnalyticsStats(idToken: string) {
  try {
    await requireAdminSession(idToken);

    // Usamos la función cacheada para ahorrar 100% de lecturas redundantes
    const stats = await getCachedAnalyticsStats();

    return {
      success: true,
      stats,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error al procesar analíticas';
    logger.error('[getAnalyticsStats] Error', { error: msg });
    return { success: false, error: msg };
  }
}

/**
 * Obtiene la lista de referidos VIP registrados en Firestore.
 */
export async function getReferrals(idToken: string) {
  try {
    await requireAdminSession(idToken);
    getAdminApp();
    const db = getFirestore();

    const snapshot = await db.collection('referidos').orderBy('createdAt', 'desc').get();

    const referrals = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        tuNumero: data.tuNumero || '',
        suNumero: data.suNumero || '',
        status: data.status || 'pendiente',
        createdAt:
          data.createdAt && typeof data.createdAt.toDate === 'function'
            ? data.createdAt.toDate().toISOString()
            : null,
        updatedAt:
          data.updatedAt && typeof data.updatedAt.toDate === 'function'
            ? data.updatedAt.toDate().toISOString()
            : null,
      };
    });

    return { success: true, data: referrals };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error al obtener referidos';
    logger.error('[getReferrals] Error', { error: msg });
    return { success: false, error: msg };
  }
}

/**
 * Actualiza el estado de un referido VIP.
 */
export async function updateReferralStatus(idToken: string, referralId: string, status: string) {
  try {
    const decodedToken = await requireAdminSession(idToken);
    getAdminApp();
    const db = getFirestore();

    const docRef = db.collection('referidos').doc(referralId);
    await docRef.update({
      status,
      updatedAt: Timestamp.now(),
    });

    const { logAdminAction } = await import('@/app/admin/audit-actions');
    await logAdminAction({
      adminEmail: decodedToken.email || decodedToken.uid,
      action: 'UPDATE',
      resource: 'VIP_Referrals',
      details: { referralId, status },
    });

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error al actualizar referido';
    logger.error('[updateReferralStatus] Error', { error: msg });
    return { success: false, error: msg };
  }
}
