import { del, list } from '@vercel/blob';
import { NextResponse } from 'next/server';

/**
 * Escudo de Billetera: Limpieza Automática de Vercel Blob
 * Desmulta v5.11.0 - MANDATO-FILTRO
 * 
 * Lógica:
 * 1. Verificación de CRON_SECRET para evitar ataques de ejecución.
 * 2. Identificación de archivos con > 30 días de antigüedad.
 * 3. Eliminación atómica para optimizar almacenamiento gratuito (250MB limit).
 */

export const runtime = 'edge';

export async function GET(request: Request) {
    // Protección básica: CRON_SECRET obligatorio
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        const { blobs } = await list();
        const ahora = Date.now();

        // Regla: 7 días para capturas de SIMIT (simit_cap_), 30 días para lo demás
        const toDelete = blobs.filter(blob => {
            const edadMilisegundos = ahora - new Date(blob.uploadedAt).getTime();
            const esCapturaTemporal = blob.pathname.includes('simit_cap_');

            const limite = esCapturaTemporal ? (7 * 24 * 60 * 60 * 1000) : (30 * 24 * 60 * 60 * 1000);
            return edadMilisegundos > limite;
        }).map(blob => blob.url);

        if (toDelete.length > 0) {
            await del(toDelete);
        }

        return NextResponse.json({
            success: true,
            deletedCount: toDelete.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error en limpieza';
        return NextResponse.json({ error: 'Fallo en la limpieza automática', details: message }, { status: 500 });
    }
}
