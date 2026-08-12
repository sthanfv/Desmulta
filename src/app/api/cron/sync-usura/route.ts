import { NextResponse, NextRequest } from 'next/server';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';
import { logger } from '@/lib/logger/security-logger';
import { timingSafeEqual } from 'crypto';
import { sendTelegramCronSuccess, sendTelegramCronError } from '@/lib/telegram';

export async function POST(request: NextRequest) {
  try {
    // 1. Verificación del CRON_SECRET (Seguridad)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      logger.error('[cron-usura] CRON_SECRET no está configurado en .env');
      return NextResponse.json({ error: 'Configuración del servidor inválida' }, { status: 500 });
    }

    const expected = Buffer.from(`Bearer ${cronSecret}`);
    const provided = Buffer.from(authHeader ?? '');
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      logger.security('[cron-usura] Intento no autorizado de ejecución de Cron Job', {
        ip: request.headers.get('x-forwarded-for'),
      });
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 2. Extraer Tasa de Usura
    // Aceptamos que el rate venga en el Body (si usamos Zapier/Make/CloudFunction avanzado)
    let newRate = 0;
    try {
      const body = await request.json();
      if (body && typeof body.rate === 'number') {
        newRate = body.rate;
      }
    } catch (_e) {
      // Body vacío, no es error, pasamos al fallback automático
    }

    // 3. Fallback: Scraping / API Automática (Robot)
    if (newRate === 0) {
      // Aquí se conectará a Datos Abiertos Colombia o a una API Fintech de confianza
      // Ejemplo usando una API pública ficticia o el dataset de datos.gov.co:
      // const res = await fetch('https://www.datos.gov.co/resource/XXXX-XXXX.json?$limit=1');
      // const data = await res.json();
      // newRate = parseFloat(data[0].tasa) * 1.5; // Interés Bancario * 1.5 = Usura

      // Simulamos que el robot falló al encontrar la API correcta (como vimos en las pruebas)
      // En un entorno real, si esto falla, enviamos el error a Telegram
      const apiExternaFallo = true;
      if (apiExternaFallo) {
        await sendTelegramCronError(
          'No se pudo resolver el Dataset ID de la Superfinanciera. Se requiere inyectar el valor vía POST body.'
        );
        return NextResponse.json({ error: 'Fallo al obtener datos externos' }, { status: 502 });
      }
    }

    // 4. Guardar en Firestore para que el Motor Go la lea
    getAdminApp();
    const db = getFirestore();
    const docRef = db.collection('config').doc('tasas_legales');

    const monthYear = new Date().toISOString().slice(0, 7); // Ej: "2026-07"

    await docRef.set(
      {
        usuraEA: newRate,
        updatedAt: FieldValue.serverTimestamp(),
        history: FieldValue.arrayUnion({
          period: monthYear,
          rate: newRate,
        }),
      },
      { merge: true }
    );

    logger.info(
      `[cron-usura] Tasa de Usura actualizada exitosamente a ${(newRate * 100).toFixed(2)}%`
    );

    // 5. Notificar a Telegram
    await sendTelegramCronSuccess(newRate);

    return NextResponse.json({ success: true, rate: newRate });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    logger.error('[cron-usura] Error crítico ejecutando cron:', { error: message });
    await sendTelegramCronError(message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
