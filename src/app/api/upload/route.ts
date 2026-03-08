/**
 * Endpoint de Carga de Archivos — Desmulta
 *
 * MANDATO-FILTRO v1.9.0:
 * - H2: console.error eliminado → logger seguro
 * - H3: Validación de tipo MIME + tamaño máximo (5MB)
 * - H4: Extracción defensiva de IP real (anti-spoofing con x-vercel-forwarded-for)
 * - H6: Sanitización estricta del nombre de archivo (prevención Path Traversal #2)
 */

import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger/security-logger';
import type { NextRequest } from 'next/server';

/** Tipos MIME permitidos para evidencia fotográfica */
const MIMES_PERMITIDOS = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

/** Tamaño máximo de archivo: 5 MB */
const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;

/** Longitud máxima del nombre de archivo sanitizado */
const LONGITUD_MAXIMA_FILENAME = 100;

/**
 * Sanitiza el nombre de un archivo eliminando cualquier carácter
 * que no sea alfanumérico, guion, guion bajo o punto.
 * Previene Path Traversal, XSS y caracteres de control.
 *
 * @param nombre - Nombre de archivo crudo recibido del cliente
 * @returns Nombre sanitizado seguro para usar en Vercel Blob
 * @throws Error si el nombre queda vacío después de sanitizar
 */
function sanitizarNombreArchivo(nombre: string): string {
  // Eliminar cualquier caracter fuera de la allowlist
  const sanitizado = nombre
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, LONGITUD_MAXIMA_FILENAME);

  if (!sanitizado || sanitizado.replace(/[._-]/g, '').length === 0) {
    throw new Error(`Nombre de archivo inválido: "${nombre}"`);
  }

  return sanitizado;
}

/**
 * Extrae la IP real del cliente de forma defensiva.
 * Prioriza el header de Vercel Edge (confiable) sobre x-forwarded-for (spoofable).
 *
 * @param request - Objeto NextRequest de la petición entrante
 * @returns IP del cliente como string seguro para usar como clave de rate limiting
 */
function extraerIpConfiable(request: NextRequest): string {
  // x-vercel-forwarded-for es inyectado por la infraestructura de Vercel y no puede ser suplantado por el cliente
  const ipVercel = request.headers.get('x-vercel-forwarded-for');
  if (ipVercel) {
    return ipVercel.split(',')[0].trim();
  }

  // Fallback para entornos locales de desarrollo
  const ipForwarded = request.headers.get('x-forwarded-for');
  if (ipForwarded) {
    return ipForwarded.split(',')[0].trim();
  }

  return '127.0.0.1';
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // H4: Extracción defensiva de IP real (anti-spoofing)
    const clienteIp = extraerIpConfiable(request);
    const hoy = new Date().toISOString().split('T')[0];
    const docId = `${clienteIp}_${hoy}`.replace(/[.:]/g, '_');

    const db = getFirestore(getAdminApp());
    const rateLimitRef = db.collection('upload_rate_limits').doc(docId);

    const docSnap = await rateLimitRef.get();
    let contador = 0;

    if (docSnap.exists) {
      contador = docSnap.data()?.count || 0;
      const limite = process.env.NODE_ENV === 'production' ? 3 : 10;
      if (contador >= limite) {
        return NextResponse.json(
          {
            error: `Ha superado el límite de ${limite} cargas seguras por día. Por favor, intente mañana o contacte a soporte.`,
          },
          { status: 429 }
        );
      }
    }

    // H3: Validación de tipo MIME — se rechaza todo lo que no sea imagen permitida
    const contentType = request.headers.get('content-type') || '';
    const mimePrincipal = contentType.split(';')[0].trim().toLowerCase();

    if (!MIMES_PERMITIDOS.has(mimePrincipal)) {
      logger.warn('[upload] Tipo MIME no permitido bloqueado', { contentType });
      return NextResponse.json(
        {
          error: `Tipo de archivo no permitido: "${mimePrincipal}". Solo se aceptan imágenes (JPEG, PNG, WebP, GIF).`,
        },
        { status: 415 }
      );
    }

    // H3: Validación de tamaño mediante Content-Length antes de leer el stream
    const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
    if (contentLength > TAMANO_MAXIMO_BYTES) {
      logger.warn('[upload] Archivo demasiado grande bloqueado', { contentLength });
      return NextResponse.json(
        { error: 'El archivo supera el límite de 5 MB permitido.' },
        { status: 413 }
      );
    }

    // H6: Sanitización del nombre de archivo desde query params
    const { searchParams } = new URL(request.url);
    const filenameRaw = searchParams.get('filename');

    if (!filenameRaw) {
      return NextResponse.json(
        { error: 'El nombre del archivo (filename) es requerido como parámetro.' },
        { status: 400 }
      );
    }

    let filenameSanitizado: string;
    try {
      filenameSanitizado = sanitizarNombreArchivo(filenameRaw);
    } catch {
      logger.warn('[upload] Nombre de archivo inválido bloqueado', { filenameRaw });
      return NextResponse.json(
        { error: 'El nombre del archivo contiene caracteres no permitidos.' },
        { status: 400 }
      );
    }

    // Carga a Vercel Blob con prefijo de identificación y sufijo aleatorio
    const blob = await put(`simit_cap_${filenameSanitizado}`, request.body as ReadableStream, {
      access: 'public',
      addRandomSuffix: true,
    });

    // Registrar incremento de límite de tasa
    await rateLimitRef.set(
      {
        ip: clienteIp,
        fecha: hoy,
        count: contador + 1,
        ultimaCargaEn: new Date().toISOString(),
      },
      { merge: true }
    );

    logger.info('[upload] Archivo cargado correctamente', {
      filename: filenameSanitizado,
      mime: mimePrincipal,
    });

    return NextResponse.json(blob);
  } catch (error) {
    // H2: Usar logger seguro en lugar de console.error directo
    const mensaje = error instanceof Error ? error.message : 'Error desconocido';
    logger.error('[upload] Error crítico al procesar la carga', { error: mensaje });
    return NextResponse.json(
      { error: 'Error interno al procesar el archivo.' },
      { status: 500 }
    );
  }
}

