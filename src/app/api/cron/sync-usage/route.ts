import { NextResponse } from 'next/server';
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
  // 1. Verificación básica de seguridad para el Cron (Vercel manda un token)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Obtener todas las keys que tuvieron actividad
    const keysToSync = await redis.smembers('apikey:sync_queue');
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
          ultimoUso: ultimoUso || new Date().toISOString()
        });
        syncedCount++;
      }
    }

    // 4. Ejecutar la escritura en lote a Firestore
    if (syncedCount > 0) {
      await batch.commit();
      logger.info(`[sync-usage-cron] Sincronizadas ${syncedCount} keys a Firestore.`);
      
      // 5. Limpiar la cola de sincronización
      await redis.del('apikey:sync_queue');
    }

    return NextResponse.json({ message: 'Sincronización exitosa', syncedCount }, { status: 200 });
  } catch (error) {
    logger.error('[sync-usage-cron] Fallo en la sincronización:', { error: String(error) });
    return NextResponse.json({ error: 'Fallo interno en la sincronización' }, { status: 500 });
  }
}
