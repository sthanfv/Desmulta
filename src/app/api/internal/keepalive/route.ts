import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger/security-logger';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';

// 60 segundos de vida máxima para poder ejecutar el Jitter de hasta 45s
export const maxDuration = 60; 
export const dynamic = 'force-dynamic';

async function handler(request: Request) {
  // 1. Lógica Anti-Detección: Jitter Algorítmico (Ruido)
  // Genera un retraso aleatorio entre 1 y 45 segundos (1000ms - 45000ms)
  const jitterMs = Math.floor(Math.random() * 44000) + 1000;
  
  logger.info(`[KEEPALIVE] QStash Cron iniciado. Aplicando Jitter de ${jitterMs}ms antes de disparar Pings...`);
  
  // Vercel pausará la ejecución en este punto durante el Jitter aleatorio
  await new Promise((resolve) => setTimeout(resolve, jitterMs));

  // 2. Disparar Pings Asíncronos a las máquinas de Render
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
    const goHealthUrl = goEngineUrl.replace('/api/v1/calcular-multa', '/health');
    logger.info(`[KEEPALIVE] Pinging Go Engine: ${goHealthUrl}`);
    pingPromises.push(
      fetch(goHealthUrl, { method: 'GET' })
        .then(res => res.text())
        .catch(err => logger.error('[KEEPALIVE] Go ping falló', err))
    );
  }

  await Promise.allSettled(pingPromises);
  logger.info('[KEEPALIVE] Pings completados con éxito y Jitter aplicado.');
  
  return NextResponse.json({
    status: 'woke_up',
    jitter_applied_ms: jitterMs,
    timestamp: new Date().toISOString()
  });
}

// 3. Exportar el handler envuelto en el middleware de seguridad de QStash
// Solo permitirá peticiones que vengan firmadas criptográficamente por Upstash
export const POST = verifySignatureAppRouter(handler);
export const GET = verifySignatureAppRouter(handler);
