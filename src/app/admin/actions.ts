'use server';

import { put } from '@vercel/blob';
import { revalidatePath } from 'next/cache';

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
    });

    // Revalidate the homepage to reflect the new image
    revalidatePath('/');

    return { url: blob.url };
  } catch (error) {
    console.error('Error al subir la imagen a Vercel Blob:', error);
    return { error: 'No se pudo subir la imagen.' };
  }
}
