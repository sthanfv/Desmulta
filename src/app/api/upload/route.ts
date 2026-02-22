import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');

  if (!filename) {
    return NextResponse.json(
      { error: 'El nombre del archivo (filename) es requerido como parámetro de consulta.' },
      { status: 400 }
    );
  }

  try {
    const blob = await put(filename, request.body as ReadableStream, {
      access: 'public',
      // Agregar opciones adicionales si es necesario, por ejemplo `addRandomSuffix: true` (por defecto es true)
    });

    return NextResponse.json(blob);
  } catch (error) {
    console.error('Error al subir a Vercel Blob:', error);
    return NextResponse.json({ error: 'Error interno al procesar el archivo.' }, { status: 500 });
  }
}
