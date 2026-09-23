import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger/security-logger';
import { FIRESTORE_COLLECTION } from '@/lib/security/api-key-guard';

const redis = Redis.fromEnv();

export const dynamic = 'force-dynamic';

/**
 * CRON Job: Sincroniza los contadores de uso B2B desde Redis a Firestore en lote.
 * Protegido mediante un Authorization Header o IP autorizada en Vercel Cron.
 */
export async function GET(request: Request) {
  // 1. Verificación de seguridad con comparación de tiempo constante (anti-timing attack)
  // 🛡️ F-13 DEVSECOPS: Usar timingSafeEqual en lugar de !== para evitar timing oracle.
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  // [2026-09-22] FIX: fail-closed. Antes, sin CRON_SECRET el endpoint quedaba abierto.
  if (!cronSecret) {
    logger.error('[sync-usage-cron] CRON_SECRET no configurado');
    return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
  }
  const provided = Buffer.from(authHeader || '');
  const expected = Buffer.from(`Bearer ${cronSecret}`);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Obtener la cantidad de keys y extraerlas atómicamente con spop
    const queueSize = await redis.scard('apikey:sync_queue');
    if (queueSize === 0) {
      return NextResponse.json({ message: 'Nada que sincronizar' }, { status: 200 });
    }

    // Extraer todas las keys de la cola (SPOP remueve y retorna)
    const keysToSync = await redis.spop<string[]>('apikey:sync_queue', queueSize);

    if (!keysToSync || keysToSync.length === 0) {
      return NextResponse.json({ message: 'Nada que sincronizar' }, { status: 200 });
    }

    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);
    const mesActual = new Date().toISOString().substring(0, 7);
    const batch = db.batch();

    let syncedCount = 0;

    // 3. Iterar y sincronizar cada key
    for (const keyId of keysToSync) {
      const docRef = db.collection(FIRESTORE_COLLECTION).doc(keyId);

      // Leer valores desde Redis
      const [usoTotalStr, usoMesStr, ultimoUso] = await Promise.all([
        redis.get<string>(`apikey:usoTotal:${keyId}`),
        redis.get<string>(`apikey:usoMes:${mesActual}:${keyId}`),
        redis.get<string>(`apikey:ultimoUso:${keyId}`),
      ]);

      if (usoTotalStr || usoMesStr) {
        batch.update(docRef, {
          usoTotal: usoTotalStr ? Number(usoTotalStr) : undefined,
          usoMesActual: usoMesStr ? Number(usoMesStr) : undefined,
          mesActual: mesActual,
          ultimoUso: ultimoUso || new Date().toISOString(),
        });
        syncedCount++;
      }
    }

    // 4. Ejecutar la escritura en lote a Firestore
    if (syncedCount > 0) {
      try {
        await batch.commit();
        logger.info(`[sync-usage-cron] Sincronizadas ${syncedCount} keys a Firestore.`);
      } catch (batchErr) {
        // Fallback: Si Firestore falla, reinsertar en Dead Letter Queue para no perder datos
        logger.error(`[sync-usage-cron] Fallo guardando en Firestore, moviendo a DLQ.`, {
          err: String(batchErr),
        });
        if (keysToSync.length > 0) {
          // Sadd acepta varios argumentos, pero para evitar problemas de tipos con Upstash:
          for (const key of keysToSync) {
            await redis.sadd('apikey:sync_dlq', key);
          }
        }
        throw batchErr;
      }
    }

    return NextResponse.json({ message: 'Sincronización exitosa', syncedCount }, { status: 200 });
  } catch (error) {
    logger.error('[sync-usage-cron] Fallo en la sincronización:', { error: String(error) });
    return NextResponse.json({ error: 'Fallo interno en la sincronización' }, { status: 500 });
  }
}
