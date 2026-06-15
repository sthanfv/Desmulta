import { type NextRequest, NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { logger } from '@/lib/logger/security-logger';
import { applyWatermark, fileToBuffer, buildWatermarkedFilename } from '@/lib/image-watermark';
import { checkRateLimit } from '@/lib/security/rate-limit';

/**
 * POST /api/gallery
 * Aplica marca de agua → sube a Vercel Blob → guarda metadatos en Firestore.
 * Requiere token de Firebase Admin en el header Authorization.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limit
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateLimitStatus = await checkRateLimit('galleryUpload', ip);
    if (!rateLimitStatus.success) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes de subida. Por favor, intente de nuevo más tarde.' },
        { status: 429 }
      );
    }

    // 1.5. Validar cabecera Origin (Mitigación CSRF)
    const origin = req.headers.get('origin') || req.headers.get('Origin');
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (siteUrl && origin && origin !== siteUrl) {
      return NextResponse.json(
        { error: 'Acceso prohibido: Origen no permitido (CSRF).' },
        { status: 403 }
      );
    }

    // 2. Verificar autenticación
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const idToken = authHeader.slice(7);

    getAdminApp();
    const decodedToken = await getAuth().verifyIdToken(idToken);

    const db = getFirestore();
    const adminDoc = await db.collection('admins').doc(decodedToken.uid).get();
    if (!adminDoc.exists) {
      return NextResponse.json(
        { error: 'Acceso denegado: No eres administrador.' },
        { status: 403 }
      );
    }

    // 2. Parsear el FormData
    const formData = await req.formData();
    const title = formData.get('title') as string | null;
    const beforeFile = formData.get('beforeImage') as File | null;
    const afterFile = formData.get('afterImage') as File | null;

    if (!title || !beforeFile || !afterFile) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios (title, beforeImage, afterImage).' },
        { status: 400 }
      );
    }

    const MAX_SIZE = 5 * 1024 * 1024;
    if (beforeFile.size > MAX_SIZE || afterFile.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Las imágenes no pueden superar los 5MB.' },
        { status: 400 }
      );
    }

    // 3. Convertir a Buffer y aplicar marca de agua
    const [beforeBuffer, afterBuffer] = await Promise.all([
      fileToBuffer(beforeFile),
      fileToBuffer(afterFile),
    ]);

    const [beforeResult, afterResult] = await Promise.all([
      applyWatermark(beforeBuffer, beforeFile.type, {
        brand: '© Desmulta',
        position: 'bottom-left',
        opacity: 100,
      }),
      applyWatermark(afterBuffer, afterFile.type, {
        brand: '© Desmulta',
        position: 'bottom-right',
        opacity: 160,
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

    // 4. Subir a Vercel Blob
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

    // 5. Guardar en Firestore
    const docRef = await db.collection('success_cases').add({
      title,
      beforeImageUrl: beforeBlob.url,
      afterImageUrl: afterBlob.url,
      createdAt: new Date().toISOString(),
      watermarked: true,
    });

    return NextResponse.json({ success: true, id: docRef.id }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error interno del servidor';
    const isSharpMissing = msg.includes('Cannot find module') && msg.includes('sharp');
    logger.error('[API /gallery POST] Error al subir caso de éxito', {
      isSharpMissing,
      detalle: msg,
    });
    return NextResponse.json(
      {
        error: isSharpMissing
          ? 'sharp no instalado. Ejecuta: npm install sharp'
          : 'Error interno del servidor',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/gallery
 * Retorna los casos de éxito públicos desde Firestore.
 * Cacheado 60s en Vercel Edge, revalidación hasta 5 min.
 */
export async function GET() {
  try {
    getAdminApp();
    const db = getFirestore();
    const snapshot = await db
      .collection('success_cases')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const cases = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(
      { cases },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error interno';
    logger.error('[API /gallery GET] Error al obtener casos de éxito', { detalle: msg });
    return NextResponse.json({ error: 'Error interno del servidor', cases: [] }, { status: 500 });
  }
}

/**
 * DELETE /api/gallery
 * Elimina un caso de éxito de Firestore y sus imágenes de Vercel Blob.
 */
export async function DELETE(req: NextRequest) {
  try {
    // 1. Rate Limit
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateLimitStatus = await checkRateLimit('galleryDelete', ip);
    if (!rateLimitStatus.success) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes de eliminación. Por favor, intente de nuevo más tarde.' },
        { status: 429 }
      );
    }

    // 1.5. Validar cabecera Origin (Mitigación CSRF)
    const origin = req.headers.get('origin') || req.headers.get('Origin');
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (siteUrl && origin && origin !== siteUrl) {
      return NextResponse.json(
        { error: 'Acceso prohibido: Origen no permitido (CSRF).' },
        { status: 403 }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const idToken = authHeader.slice(7);

    getAdminApp();
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const db = getFirestore();
    const adminDoc = await db.collection('admins').doc(decodedToken.uid).get();
    if (!adminDoc.exists) {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
    }

    const { id, beforeImageUrl, afterImageUrl } = await req.json();
    if (!id || !beforeImageUrl || !afterImageUrl) {
      return NextResponse.json(
        { error: 'Faltan parámetros (id, beforeImageUrl, afterImageUrl).' },
        { status: 400 }
      );
    }

    await Promise.all([
      del([beforeImageUrl, afterImageUrl]),
      db.collection('success_cases').doc(id).delete(),
    ]);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error interno';
    logger.error('[API /gallery DELETE] Error al eliminar caso de éxito', { detalle: msg });
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
