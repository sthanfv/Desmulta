/**
 * Endpoint de Carga de Archivos — Desmulta
 *
 * MANDATO-FILTRO v2.3.4:
 * - Depuración agresiva con logs de cada paso.
 * - Saneamiento de linter y restauración de lógica de nombres.
 */

import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger/security-logger';
import type { NextRequest } from 'next/server';

const MIMES_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
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
    const hoy = new Date().toISOString().split('T')[0];
    const docId = `${clienteIp}_${hoy}`.replace(/[.:]/g, '_');

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
    // MANDATO-FILTRO v2.3.4: Límite estricto de 5 cargas por IP/día solicitado por el usuario
    const limite = 5;

    if (docSnap.exists) {
      contador = docSnap.data()?.count || 0;
      if (contador >= limite) {
        logger.warn('[upload] Límite excedido bloqueado:', { clienteIp, contador });
        return NextResponse.json(
          { error: `Límite diario de ${limite} cargas alcanzado.` },
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
        { error: `Formato ${mimePrincipal} no permitido.` },
        { status: 415 }
      );
    }

    // Carga a Vercel Blob
    logger.info('[upload] Paso 3: Enviando a Vercel Blob...', { filename: filenameSanitizado });
    const blob = await put(`simit_cap_${filenameSanitizado}`, request.body as ReadableStream, {
      access: 'public',
      addRandomSuffix: true,
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

    logger.info('[upload] ¡ÉXITO!', { url: blob.url });
    return NextResponse.json(blob);
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error desconocido';
    logger.error('[upload] Error crítico v2.3.4:', {
      error: mensaje,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ error: `Error del servidor: ${mensaje}` }, { status: 500 });
  }
}
