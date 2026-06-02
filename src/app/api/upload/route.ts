/**
 * Endpoint de Carga de Archivos — Desmulta
 *
 * MANDATO-FILTRO v2.4.4:
 * - Depuración agresiva con logs de cada paso.
 * - Saneamiento de linter y restauración de lógica de nombres.
 */

import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger/security-logger';
import type { NextRequest } from 'next/server';

const MIMES_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp']);

const LONGITUD_MAXIMA_FILENAME = 100;

function sanitizarNombreArchivo(nombre: string): string {
  const sanitizado = nombre.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, LONGITUD_MAXIMA_FILENAME);
  if (!sanitizado || sanitizado.replace(/[._-]/g, '').length === 0) {
    throw new Error(`Nombre inválido: "${nombre}"`);
  }
  return sanitizado;
}

function extraerIpConfiable(request: NextRequest): string {
  const ipVercel = request.headers.get('x-vercel-forwarded-for');
  if (ipVercel) return ipVercel.split(',')[0].trim();
  const ipForwarded = request.headers.get('x-forwarded-for');
  if (ipForwarded) return ipForwarded.split(',')[0].trim();
  return '127.0.0.1';
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const clienteIp = extraerIpConfiable(request);
    const authorUid = request.headers.get('x-author-uid') || clienteIp;
    const hoy = new Date().toISOString().split('T')[0];
    const docId = `${authorUid}_${hoy}`.replace(/[.:]/g, '_');

    logger.info('[upload] Paso 1: Iniciando para IP:', { clienteIp, docId });

    // H6: Sanitización del nombre
    const { searchParams } = new URL(request.url);
    const filenameRaw = searchParams.get('filename') || 'archivo.jpg';
    const filenameSanitizado = sanitizarNombreArchivo(filenameRaw);

    // Conectar DB y validar rate limit
    logger.info('[upload] Paso 2: Conectando Firebase Admin...');
    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);
    const rateLimitRef = db.collection('upload_rate_limits').doc(docId);

    const docSnap = await rateLimitRef.get();
    let contador = 0;
    // MANDATO-FILTRO v2.4.4: Límite estricto de 5 cargas por IP/día solicitado por el usuario
    const limite = 5;

    if (docSnap.exists) {
      contador = docSnap.data()?.count || 0;
      if (contador >= limite) {
        logger.warn('[upload] Límite excedido bloqueado:', { clienteIp, contador });

        // Calcular tiempo hasta medianoche UTC (cuando cambia la fecha ISO)
        const ahora = new Date();
        const mañana = new Date(
          Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate() + 1)
        );
        const msFaltantes = mañana.getTime() - ahora.getTime();
        const horas = Math.floor(msFaltantes / (1000 * 60 * 60));
        const minutos = Math.floor((msFaltantes % (1000 * 60 * 60)) / (1000 * 60));

        let tiempoEspera = '';
        if (horas > 0) {
          tiempoEspera = `${horas} ${horas === 1 ? 'hora' : 'horas'} y ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`;
        } else {
          tiempoEspera = `${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`;
        }

        return NextResponse.json(
          {
            error: `¡Has alcanzado el límite de seguridad diario! Solo permitimos ${limite} cargas por día para proteger el sistema. Por favor, intenta de nuevo en ${tiempoEspera}.`,
          },
          { status: 429 }
        );
      }
    }

    // Validar MIME
    const contentType = request.headers.get('content-type') || '';
    const mimePrincipal = contentType.split(';')[0].trim().toLowerCase();
    if (!MIMES_PERMITIDOS.has(mimePrincipal)) {
      logger.warn('[upload] MIME no permitido:', { mimePrincipal });
      return NextResponse.json(
        {
          error: `Ups, el formato de tu archivo no es una imagen válida. Por favor, usa una foto en formato JPG, PNG o WebP.`,
        },
        { status: 415 }
      );
    }

    // ✅ Leer el body completo en un buffer — el Content-Length es bypasseable, los bytes no
    const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
    const bodyBuffer = await request.arrayBuffer();

    if (bodyBuffer.byteLength > MAX_SIZE_BYTES) {
      logger.warn('[upload] Tamaño real de archivo excede el límite:', {
        bytes: bodyBuffer.byteLength,
      });
      return NextResponse.json(
        { error: 'La imagen no puede superar 10 MB. Por favor usa una foto más pequeña.' },
        { status: 413 }
      );
    }

    // ✅ Validación por magic bytes — impide archivos disfrazados con extensión falsa
    const bytes = new Uint8Array(bodyBuffer);
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    const isWebp =
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;

    if (!isJpeg && !isPng && !isWebp) {
      logger.warn('[upload] Magic bytes inválidos — archivo no es imagen real:', { mimePrincipal });
      return NextResponse.json(
        { error: 'El archivo no es una imagen válida. Por favor usa JPG, PNG o WebP.' },
        { status: 415 }
      );
    }

    // Carga a Vercel Blob desde el buffer (el stream ya fue consumido)
    logger.info('[upload] Paso 3: Enviando a Vercel Blob...', { filename: filenameSanitizado });
    const blob = await put(`simit_cap_${filenameSanitizado}`, bodyBuffer, {
      access: 'public',
      addRandomSuffix: true,
      contentType: mimePrincipal,
    });

    // Actualizar contador
    logger.info('[upload] Paso 4: Actualizando contador en DB...');
    await rateLimitRef.set(
      {
        ip: clienteIp,
        fecha: hoy,
        count: contador + 1,
        ultimaCargaEn: new Date().toISOString(),
      },
      { merge: true }
    );

    logger.info('¡ÉXITO!', { url: blob.url });
    return NextResponse.json(blob);
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error desconocido';
    logger.error('[upload] Error crítico v2.4.4:', {
      error: mensaje,
    });
    return NextResponse.json(
      {
        error:
          'No pudimos subir tu captura en este momento. Por favor, verifica que tu internet funcione bien e intenta de nuevo.',
      },
      { status: 500 }
    );
  }
}
