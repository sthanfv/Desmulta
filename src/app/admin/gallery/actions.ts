'use server';

/**
 * 🛡️ Server Actions — Galería de Casos de Éxito
 *
 * Pipeline de subida:
 *   File (FormData) → Buffer → Watermark (sharp) → Vercel Blob → Firestore
 *
 * La marca de agua se aplica en el servidor, ANTES de subir a Blob,
 * por lo que las URLs públicas siempre contienen la imagen protegida.
 */

import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { requireAdminSession } from '@/lib/auth/require-admin-session';
import { revalidatePath } from 'next/cache';
import { put, del } from '@vercel/blob';
import { applyWatermark, fileToBuffer, buildWatermarkedFilename } from '@/lib/image-watermark';
import { logger } from '@/lib/logger/security-logger';

export interface SuccessCase {
  id: string;
  title: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  createdAt: string;
  watermarked?: boolean;
}

export async function getSuccessCases(): Promise<SuccessCase[]> {
  getAdminApp();
  const db = getFirestore();
  const snapshot = await db
    .collection('success_cases')
    .orderBy('createdAt', 'desc')
    .limit(15)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<SuccessCase, 'id'>),
  }));
}

export async function addSuccessCase(
  idToken: string,
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  try {
    await requireAdminSession(idToken);

    const title = formData.get('title') as string;
    const beforeFile = formData.get('beforeImage') as File;
    const afterFile = formData.get('afterImage') as File;

    if (!title || !beforeFile || !afterFile) {
      return { error: 'Faltan campos obligatorios' };
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (beforeFile.size > MAX_SIZE || afterFile.size > MAX_SIZE) {
      return { error: 'Las imágenes no pueden superar los 5MB' };
    }

    // ── 1. Convertir File → Buffer ─────────────────────────────────────────
    const [beforeBuffer, afterBuffer] = await Promise.all([
      fileToBuffer(beforeFile),
      fileToBuffer(afterFile),
    ]);

    // ── 2. Aplicar marca de agua ───────────────────────────────────────────
    // La imagen ANTES no se marca (es evidencia del estado original)
    // La imagen DESPUÉS sí se marca (es la que muestra el resultado)
    const [beforeResult, afterResult] = await Promise.all([
      applyWatermark(beforeBuffer, beforeFile.type, {
        brand: '© Desmulta',
        position: 'bottom-left',
        opacity: 100, // Marca más sutil en el "antes"
      }),
      applyWatermark(afterBuffer, afterFile.type, {
        brand: '© Desmulta',
        position: 'bottom-right',
        opacity: 160, // Marca más visible en el "después"
      }),
    ]);

    const ts = Date.now();
    const beforeFilename = buildWatermarkedFilename(
      `${ts}-antes-${beforeFile.name}`,
      beforeResult.format
    );
    const afterFilename = buildWatermarkedFilename(
      `${ts}-despues-${afterFile.name}`,
      afterResult.format
    );

    // ── 3. Subir a Vercel Blob ─────────────────────────────────────────────
    const [beforeBlob, afterBlob] = await Promise.all([
      put(`casos-exito/${beforeFilename}`, beforeResult.buffer, {
        access: 'public',
        addRandomSuffix: true,
        contentType: `image/${beforeResult.format === 'jpeg' ? 'jpeg' : beforeResult.format}`,
      }),
      put(`casos-exito/${afterFilename}`, afterResult.buffer, {
        access: 'public',
        addRandomSuffix: true,
        contentType: `image/${afterResult.format === 'jpeg' ? 'jpeg' : afterResult.format}`,
      }),
    ]);

    // ── 4. Guardar metadatos en Firestore ─────────────────────────────────
    getAdminApp();
    const db = getFirestore();
    await db.collection('success_cases').add({
      title,
      beforeImageUrl: beforeBlob.url,
      afterImageUrl: afterBlob.url,
      createdAt: new Date().toISOString(),
      watermarked: true,
    });

    logger.info('[Gallery] Caso de éxito subido con marca de agua', {
      title,
      beforeUrl: beforeBlob.url,
      afterUrl: afterBlob.url,
    });

    revalidatePath('/');
    revalidatePath('/admin/gallery');
    revalidatePath('/servicios', 'layout'); // MANDATO-FILTRO: Purga caché ISR de ciudades

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error interno';
    logger.error('[Gallery] Error al subir caso de éxito', { error: msg });

    // Diagnóstico específico para sharp no instalado
    if (msg.includes('Cannot find module') && msg.includes('sharp')) {
      return {
        error:
          'sharp no está instalado. Ejecuta: npm install sharp && npm install --save-dev @types/sharp',
      };
    }

    return { error: msg };
  }
}

export async function deleteSuccessCase(
  idToken: string,
  id: string,
  beforeUrl: string,
  afterUrl: string
) {
  try {
    await requireAdminSession(idToken);

    await del([beforeUrl, afterUrl]);

    getAdminApp();
    const db = getFirestore();
    await db.collection('success_cases').doc(id).delete();

    logger.info('[Gallery] Caso de éxito eliminado', { id });

    revalidatePath('/');
    revalidatePath('/admin/gallery');
    revalidatePath('/servicios', 'layout'); // MANDATO-FILTRO: Purga caché ISR de ciudades

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error interno';
    logger.error('[Gallery] Error al eliminar caso de éxito', { id, error: msg });
    return { error: msg };
  }
}
