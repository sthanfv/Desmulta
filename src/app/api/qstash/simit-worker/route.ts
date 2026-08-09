import { NextRequest, NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { logger } from '@/lib/logger/security-logger';
import {
  updateSubscriptionAfterCheck,
  getActiveSubscriptions,
  getDueSubscriptions,
} from '@/lib/data/simit-subscriptions';
import { shouldExecuteWorker, getRandomBatchSize } from '@/lib/security/stochastic-engine';
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

    const isDev = process.env.NODE_ENV === 'development';

    if (!signature && !isDev) {
      logger.warn('[simit-worker] Intento de acceso sin firma QStash');
      return NextResponse.json({ error: 'Firma QStash requerida' }, { status: 401 });
    }

    if (signature) {
      const isValid = await receiver.verify({ signature, body: bodyText });
      if (!isValid && !isDev) {
        return NextResponse.json({ error: 'Firma QStash inválida' }, { status: 401 });
      }
    }

    const payload = bodyText ? JSON.parse(bodyText) : {};
    
    let cedulas: string[];
    let subsMap = new Map();
    
    if (payload.cedulas && Array.isArray(payload.cedulas) && payload.cedulas.length > 0) {
      cedulas = payload.cedulas; // Ejecución manual/prueba
      const manualSubs = await getActiveSubscriptions();
      subsMap = new Map(manualSubs.map((s) => [s.cedula, s]));
    } else {
      // 2. Lógica Estocástica (Jitter + Lotes)
      // Con un CRON cada 1 minuto (900 m útiles al día) y 6% prob = ~54 ejecuciones/día.
      const executionProbability = 0.06; 
      const decision = shouldExecuteWorker(new Date(), executionProbability);
      
      if (!decision.execute) {
        logger.info(`[simit-worker] Ejecución estocástica saltada: ${decision.reason}`);
        return NextResponse.json({ success: true, message: `Skipped: ${decision.reason}` });
      }

      const batchSize = getRandomBatchSize(1, 4); // Lotes de 1 a 4 cédulas
      const dueSubscriptions = await getDueSubscriptions(batchSize);
      
      if (dueSubscriptions.length === 0) {
        logger.info('[simit-worker] No hay suscripciones pendientes de revisión en este momento');
        return NextResponse.json({ success: true, message: 'No due subscriptions' });
      }

      subsMap = new Map(dueSubscriptions.map((s) => [s.cedula, s]));
      cedulas = dueSubscriptions.map((s) => s.cedula); 
    }

    logger.info(`[simit-worker] Iniciando procesamiento de lote con ${cedulas.length} cédulas`);

    // 3. Llamar al Scraper en Cloud Run
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

      // Notificar por Push (FCM) si el usuario lo activó
      if (hasChanges && sub?.pushToken) {
        try {
          const { getMessaging } = await import('firebase-admin/messaging');
          const { getAdminApp } = await import('@/lib/firebase-admin');
          
          await getMessaging(getAdminApp()).send({
            token: sub.pushToken,
            notification: {
              title: totalMultas > previousCount ? '🚨 Nueva Multa SIMIT' : '✅ Cambio SIMIT',
              body: `Detectamos movimientos en el estado de cuenta de la cédula ${ced}.`,
            },
            webpush: {
              fcmOptions: {
                link: 'https://desmulta.online/escudo-simit'
              }
            }
          });
          logger.info(`[simit-worker] Notificación Push enviada exitosamente para cédula ${ced}`);
        } catch (pushErr) {
          logger.warn('[simit-worker] Fallo al enviar notificación Push FCM', {
            error: pushErr instanceof Error ? pushErr.message : String(pushErr),
            cedula: ced
          });
        }
      }
    }

    logger.info(`[simit-worker] Lote procesado con éxito. Total: ${scraperData.results.length}`);
    return NextResponse.json({ success: true, processed: scraperData.results.length });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : '';
    logger.error('[simit-worker] Error en el worker', { error: msg, stack });
    
    // Loguear el error directamente en Firestore para poder verlo desde mi consola local
    try {
      const { getFirestore } = await import('firebase-admin/firestore');
      const { getAdminApp } = await import('@/lib/firebase-admin');
      await getFirestore(getAdminApp()).collection('worker_logs').add({
        timestamp: Date.now(),
        error: msg,
        stack: stack,
        source: 'simit-worker'
      });
    } catch (e) {}

    return NextResponse.json({ error: 'Procesamiento fallido', details: msg, stack }, { status: 500 });
  }
}
