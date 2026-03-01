import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const ip =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';

    // Convertir IP compleja o lista de proxies a la original (primera en la lista)
    const clientIp = ip.split(',')[0].trim();

    // Obtener la fecha en formato YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];
    const docId = `${clientIp}_${today}`.replace(/[\.\:]/g, '_'); // Sanitizar caracteres de IPs para ID de Documento Firestore

    const db = getFirestore(getAdminApp());
    const rateLimitRef = db.collection('upload_rate_limits').doc(docId);

    const docSnap = await rateLimitRef.get();
    let count = 0;

    if (docSnap.exists) {
      count = docSnap.data()?.count || 0;
      if (count >= 3) {
        return NextResponse.json(
          {
            error:
              'Has superado el límite de 3 subidas seguras por día. Por favor, intenta de nuevo mañana o contacta a soporte.',
          },
          { status: 429 }
        );
      }
    }

    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json(
        { error: 'El nombre del archivo (filename) es requerido como parámetro de consulta.' },
        { status: 400 }
      );
    }

    // Subida a Vercel Blob con prefijo para identificación
    const blob = await put(`simit_cap_${filename}`, request.body as ReadableStream, {
      access: 'public',
      addRandomSuffix: true,
    });

    // Registrar incremento de límite
    await rateLimitRef.set(
      {
        ip: clientIp,
        date: today,
        count: count + 1,
        lastUploadAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return NextResponse.json(blob);
  } catch (error) {
    console.error('Error al subir a Vercel Blob o procesar Rate Limiting:', error);
    return NextResponse.json(
      { error: 'Error interno al procesar el archivo o la seguridad.' },
      { status: 500 }
    );
  }
}
