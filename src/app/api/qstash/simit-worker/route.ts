import { NextRequest, NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { logger } from '@/lib/logger/security-logger';
import {
  updateSubscriptionAfterCheck,
  getActiveSubscriptions,
} from '@/lib/data/simit-subscriptions';
import { resend } from '@/lib/resend';
import { buildEscudoSimitEmail } from '@/lib/email-templates/simit-alert';

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || '',
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || '',
});

export const maxDuration = 120; // Cloud Run puede tardar hasta 60s por consulta

export async function POST(request: NextRequest) {
  try {
    // 1. Validar la firma de QStash (Seguridad estricta)
    const signature = request.headers.get('upstash-signature');
    const bodyText = await request.text();

    if (!signature) {
      logger.warn('[simit-worker] Intento de acceso sin firma QStash');
      return NextResponse.json({ error: 'Firma QStash requerida' }, { status: 401 });
    }

    const isValid = await receiver.verify({ signature, body: bodyText });
    if (!isValid) {
      return NextResponse.json({ error: 'Firma QStash inválida' }, { status: 401 });
    }

    const payload = JSON.parse(bodyText);
    const cedulas: string[] = payload.cedulas;

    if (!cedulas || !Array.isArray(cedulas) || cedulas.length === 0) {
      return NextResponse.json({ error: 'Array de cédulas vacío o inválido' }, { status: 400 });
    }

    logger.info(`[simit-worker] Iniciando procesamiento de lote con ${cedulas.length} cédulas`);

    // 2. Llamar al Scraper en Cloud Run
    const scraperUrl = process.env.SIMIT_SCRAPER_URL;
    const apiKey = process.env.SIMIT_SCRAPER_API_KEY;

    if (!scraperUrl || !apiKey) {
      throw new Error('Variables de entorno del scraper SIMIT no configuradas.');
    }

    const scraperResponse = await fetch(scraperUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ cedulas }),
    });

    if (!scraperResponse.ok) {
      const errText = await scraperResponse.text();
      throw new Error(`Error del scraper: ${scraperResponse.status} - ${errText}`);
    }

    const scraperData = await scraperResponse.json();

    if (!scraperData.success) {
      throw new Error('El scraper devolvió un estado fallido general');
    }

    // 3. Obtener todas las suscripciones para cruzar emails
    const subscriptions = await getActiveSubscriptions();
    const subsMap = new Map(subscriptions.map((s) => [s.cedula, s]));

    // 4. Procesar resultados y notificar
    for (const result of scraperData.results) {
      const ced = result.cedula;

      if (!result.success || !result.data) {
        logger.warn(`[simit-worker] Fallo al extraer datos para cédula ${ced}: ${result.error}`);
        continue;
      }

      const { resumen, multas } = result.data;
      const totalMultas = resumen?.totalMultas ?? 0;
      const valorTotal = resumen?.valorTotal ?? 0;

      // Obtener suscripción para comparación de cambios
      const sub = subsMap.get(ced);
      const previousCount = sub?.lastKnownFinesCount ?? -1;
      const hasChanges = previousCount !== -1 && totalMultas !== previousCount;

      // Actualizar estado en Firestore
      await updateSubscriptionAfterCheck(ced, totalMultas, valorTotal);

      // Notificar por email si hay cambios detectados
      if (hasChanges && sub?.email) {
        try {
          const emailHtml = buildEscudoSimitEmail(ced, { resumen, multas, textoBruto: '' });
          await resend.emails.send({
            from: 'Desmulta Escudo SIMIT <alerta@desmulta.online>',
            to: sub.email,
            subject: totalMultas > previousCount
              ? `🚨 Alerta SIMIT: Nueva multa detectada para tu cédula`
              : `✅ Escudo SIMIT: Actualización en tu estado de cuenta`,
            html: emailHtml,
          });
          logger.info(`[simit-worker] Email de alerta enviado a ${sub.email} para cédula ${ced}`);
        } catch (emailErr) {
          logger.warn('[simit-worker] Fallo al enviar email de alerta', {
            error: emailErr instanceof Error ? emailErr.message : String(emailErr),
          });
        }
      }
    }

    logger.info(`[simit-worker] Lote procesado con éxito. Total: ${scraperData.results.length}`);
    return NextResponse.json({ success: true, processed: scraperData.results.length });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('[simit-worker] Error en el worker', { error: msg });
    return NextResponse.json({ error: 'Procesamiento fallido' }, { status: 500 });
  }
}
