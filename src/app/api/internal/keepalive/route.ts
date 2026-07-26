import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger/security-logger';

// 60 segundos de vida máxima para poder ejecutar el Jitter de hasta 45s
export const maxDuration = 60; 

// Fuerza a Vercel a no cachear este endpoint
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // 1. Validación de Seguridad Estricta (Solo Vercel Cron puede ejecutar esto)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('[KEEPALIVE] Intento de ejecución de Cron Job no autorizado');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Lógica Anti-Detección: Jitter Algorítmico (Ruido)
  // Genera un retraso aleatorio entre 1 y 45 segundos (1000ms - 45000ms)
  const jitterMs = Math.floor(Math.random() * 44000) + 1000;
  
  logger.info(`[KEEPALIVE] Cron iniciado. Aplicando Jitter (Ruido Anti-Bot) de ${jitterMs}ms antes de disparar Pings...`);
  
  // Vercel pausará la ejecución en este punto durante el Jitter aleatorio
  await new Promise((resolve) => setTimeout(resolve, jitterMs));

  // 3. Disparar Pings Asíncronos a las máquinas de Render
  const ocrFallbackUrl = process.env.OCR_FALLBACK_URL;
  const goEngineUrl = process.env.GO_ENGINE_URL;

  const pingPromises: Promise<any>[] = [];

  if (ocrFallbackUrl) {
    const pythonHealthUrl = ocrFallbackUrl.replace('/api/v1/extract', '/health');
    logger.info(`[KEEPALIVE] Pinging Python OCR: ${pythonHealthUrl}`);
    pingPromises.push(
      fetch(pythonHealthUrl, { method: 'GET' })
        .then(res => res.text())
        .catch(err => logger.error('[KEEPALIVE] Python ping falló', err))
    );
  }

  if (goEngineUrl) {
    // Para Go usamos la base url sin ruta exacta si tiene health
    const goHealthUrl = goEngineUrl.replace('/api/v1/calcular-multa', '/health');
    logger.info(`[KEEPALIVE] Pinging Go Engine: ${goHealthUrl}`);
    pingPromises.push(
      fetch(goHealthUrl, { method: 'GET' })
        .then(res => res.text())
        .catch(err => logger.error('[KEEPALIVE] Go ping falló', err))
    );
  }

  // Esperar a que ambos pings terminen para asegurar que Vercel no mate la función
  await Promise.allSettled(pingPromises);

  logger.info('[KEEPALIVE] Pings completados con éxito y Jitter aplicado.');
  
  return NextResponse.json({
    status: 'woke_up',
    jitter_applied_ms: jitterMs,
    timestamp: new Date().toISOString()
  });
}
