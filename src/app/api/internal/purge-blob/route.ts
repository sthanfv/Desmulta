import { del } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { logger } from '@/lib/logger/security-logger';

/**
 * 🔐 ENDPOINT INTERNO DE PURGA (v8.9.0)
 * Permite a Google Cloud Functions solicitar el borrado de evidencias en Vercel Blob.
 * Requiere una clave secreta compartida para evitar accesos no autorizados.
 *
 * Seguridad: Valida que la URL pertenezca exclusivamente al dominio de Vercel Blob
 * antes de ejecutar el borrado, previniendo el borrado arbitrario de archivos
 * en caso de que el secreto interno sea comprometido.
 */

/** Dominio permitido para las operaciones de borrado. Solo se aceptan URLs de Vercel Blob. */
const VERCEL_BLOB_HOSTNAME = 'public.blob.vercel-storage.com';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('x-internal-secret');
    const internalSecret = process.env.INTERNAL_API_SECRET;

    if (!internalSecret) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    const provided = Buffer.from(authHeader ?? '');
    const expected = Buffer.from(internalSecret);
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL requerida y debe ser un string' }, { status: 400 });
    }

    // --- VALIDACIÓN DE DOMINIO (Protección contra borrado arbitrario) ---
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'URL inválida: no es una URL bien formada' },
        { status: 400 }
      );
    }

    // Solo se permiten URLs del dominio oficial de Vercel Blob Storage.
    // Rechaza cualquier URL externa, incluso si el secreto interno fue comprometido.
    if (!parsedUrl.hostname.endsWith(VERCEL_BLOB_HOSTNAME)) {
      logger.error('[PurgeBlob] Intento de borrado con URL no permitida', {
        url: parsedUrl.hostname,
      });
      return NextResponse.json(
        { error: `URL no permitida. Solo se aceptan URLs de ${VERCEL_BLOB_HOSTNAME}` },
        { status: 403 }
      );
    }

    // Borrado físico en la infraestructura de Vercel
    await del(url);

    return NextResponse.json({
      success: true,
      message: 'Blob purgado correctamente',
    });
  } catch (error) {
    logger.error('[PurgeBlob] Error al purgar blob', { error: String(error) });
    return NextResponse.json(
      {
        error: 'Error interno al purgar el blob',
      },
      { status: 500 }
    );
  }
}
