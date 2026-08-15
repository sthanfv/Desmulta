import { NextResponse } from 'next/server';
import { getActiveSubscriptions } from '@/lib/data/simit-subscriptions';
import { Client } from '@upstash/qstash';
import { logger } from '@/lib/logger/security-logger';

// Instanciamos el cliente de QStash (Requiere QSTASH_TOKEN en .env)
const qstash = new Client({ token: process.env.QSTASH_TOKEN || '' });

// La URL pública de Desmulta que QStash llamará
const APP_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://desmulta.com';

/**
 * Endpoint invocado por el Cron Job principal (Ej. Vercel Cron 1 vez al día).
 * Tarea: Leer suscripciones, trocearlas y agendar su ejecución a lo largo del día.
 */
export async function POST(_request: Request) {
  try {
    // Validar autorización básica si se desea proteger este cron
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const subscriptions = await getActiveSubscriptions();
    if (subscriptions.length === 0) {
      return NextResponse.json({ message: 'No hay suscripciones activas' });
    }

    const BATCH_SIZE = 10;
    const batches = [];

    // Trocear el array en lotes de 10
    for (let i = 0; i < subscriptions.length; i += BATCH_SIZE) {
      batches.push(subscriptions.slice(i, i + BATCH_SIZE));
    }

    logger.info(
      `[simit-scheduler] Procesando ${subscriptions.length} suscripciones en ${batches.length} lotes.`
    );

    // Agendar en QStash
    const results = await Promise.all(
      batches.map(async (batch, index) => {
        const cedulas = batch.map((sub) => sub.cedula);

        // Jitter a nivel de lote: El lote se enviará a QStash con un retraso (delay)
        // Hacemos que cada lote se procese de forma aleatoria dentro de las siguientes 12 horas (43200 segundos).
        const maxDelaySeconds = 12 * 60 * 60;
        const randomDelay = Math.floor(Math.random() * maxDelaySeconds);

        const response = await qstash.publishJSON({
          url: `${APP_URL}/api/qstash/simit-worker`,
          body: { cedulas },
          delay: randomDelay,
        });

        return { batchIndex: index, messageId: response.messageId, delay: randomDelay };
      })
    );

    return NextResponse.json({
      success: true,
      lotesAgendados: batches.length,
      detalles: results,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('[simit-scheduler] Error fatal', { error: msg });
    return NextResponse.json({ error: 'Error interno del scheduler' }, { status: 500 });
  }
}
