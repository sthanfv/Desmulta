import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger/security-logger';
import type { NextRequest } from 'next/server';
import { apiError } from '@/lib/types/api-response';
// 🛡️ SEGURIDAD: ipAddress es inyectada por la infraestructura de Vercel y no puede
//   ser falsificada por el cliente (a diferencia de x-forwarded-for o x-vercel-forwarded-for).
import { ipAddress } from '@vercel/functions';

const MIMES_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp']);

const LONGITUD_MAXIMA_FILENAME = 100;

function sanitizarNombreArchivo(nombre: string): string {
  const sanitizado = nombre.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, LONGITUD_MAXIMA_FILENAME);
  if (!sanitizado || sanitizado.replace(/[._-]/g, '').length === 0) {
    throw new Error(`Nombre inválido: "${nombre}"`);
  }
  return sanitizado;
}

/**
 * Extrae la IP real del cliente de forma no falsificable usando @vercel/functions.
 * En entornos locales (dev) se recurre a x-real-ip como fallback seguro.
 * NUNCA se confía en x-forwarded-for ni x-vercel-forwarded-for del cliente.
 */
function extraerIpConfiable(request: NextRequest): string {
  // En producción Vercel, ipAddress() lee de una cabecera interna no accesible al cliente.
  const ipVercel = ipAddress(request);
  if (ipVercel) return ipVercel;
  // Fallback para desarrollo local (cabecera seteada por proxies de confianza, ej: ngrok)
  const ipReal = request.headers.get('x-real-ip');
  if (ipReal) return ipReal.trim();
  return '127.0.0.1';
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const clienteIp = extraerIpConfiable(request);

    // 🛡️ SEGURIDAD: Verificar Firebase ID Token si está presente en Authorization header
    // No confiamos en headers arbitrarios como 'x-author-uid'
    const authHeader = request.headers.get('Authorization');
    let verifiedUid: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      try {
        const { getAuth } = await import('firebase-admin/auth');
        getAdminApp();
        const decoded = await getAuth().verifyIdToken(authHeader.slice(7));
        verifiedUid = decoded.uid;
      } catch {
        // Token inválido — ignorar, usar solo IP
        logger.warn('[upload] Token de autorización inválido o expirado.', { ip: clienteIp });
      }
    }

    // Usar UID verificado o IP como fallback (nunca el header no verificado)
    const authorUid = verifiedUid || clienteIp;

    // Obtener el lunes de la semana actual para conteo semanal
    const ahora = new Date();
    const dia = ahora.getUTCDay(); // 0 = Dom, 1 = Lun...
    const diff = ahora.getUTCDate() - dia + (dia === 0 ? -6 : 1);
    const lunes = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), diff));
    const semanaKey = lunes.toISOString().split('T')[0];

    const docId = `v2_${authorUid}_${semanaKey}`.replace(/[.:]/g, '_');

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
    // MANDATO-FILTRO v2.4.4: Límite estricto de 3 cargas por IP/semana para evitar abuso
    const limite = 3;

    if (docSnap.exists) {
      contador = docSnap.data()?.count || 0;
      if (contador >= limite) {
        logger.warn('[upload] Límite semanal excedido bloqueado:', { clienteIp, contador });

        return NextResponse.json(
          apiError(
            'RATE_LIMITED',
            `¡Has alcanzado el límite de seguridad! Solo permitimos ${limite} cargas por semana para proteger el sistema.`
          ),
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
        apiError(
          'INVALID_MIME',
          `Ups, el formato de tu archivo no es una imagen válida. Por favor, usa una foto en formato JPG, PNG o WebP.`
        ),
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
        apiError(
          'PAYLOAD_TOO_LARGE',
          'La imagen no puede superar 10 MB. Por favor usa una foto más pequeña.'
        ),
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
        apiError(
          'INVALID_MIME',
          'El archivo no es una imagen válida. Por favor usa JPG, PNG o WebP.'
        ),
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
    const hoyParaLog = new Date().toISOString().split('T')[0];
    await rateLimitRef.set(
      {
        ip: clienteIp,
        fecha: hoyParaLog,
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
      apiError(
        'INTERNAL_ERROR',
        'No pudimos subir tu captura en este momento. Por favor, verifica que tu internet funcione bien e intenta de nuevo.'
      ),
      { status: 500 }
    );
  }
}
