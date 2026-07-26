import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger/security-logger';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';

// 60 segundos de vida máxima para poder ejecutar el Jitter de hasta 45s
export const maxDuration = 60; 
export const dynamic = 'force-dynamic';

async function handler(request: Request) {
  // 1. Lógica Anti-Detección: Jitter Algorítmico (Ruido)
  // Genera un retraso aleatorio entre 1 y 5 segundos (1000ms - 5000ms)
  // Reducido de 45s a 5s porque Render tarda 50s en despertar. Si sumamos 45s + 50s = 95s, Vercel nos mata a los 60s.
  const jitterMs = Math.floor(Math.random() * 4000) + 1000;
  
  logger.info(`[KEEPALIVE] QStash Cron iniciado. Aplicando Jitter de ${jitterMs}ms antes de disparar Pings...`);
  
  await new Promise((resolve) => setTimeout(resolve, jitterMs));

  // 2. Disparar Pings a las máquinas con AbortController de 5 segundos.
  // No necesitamos esperar a que Render despierte (tarda 50s), solo necesitamos "tocarle la puerta".
  // Al tocarle la puerta, la máquina iniciará su proceso de encendido en background.
  const ocrFallbackUrl = process.env.OCR_FALLBACK_URL;
  const goEngineUrl = process.env.GO_ENGINE_URL;

  const pingPromises: Promise<any>[] = [];

  const createTimeoutSignal = (ms: number) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  };

  if (ocrFallbackUrl) {
    const pythonHealthUrl = ocrFallbackUrl.replace('/api/v1/extract', '/health');
    logger.info(`[KEEPALIVE] Pinging Python OCR: ${pythonHealthUrl}`);
    pingPromises.push(
      fetch(pythonHealthUrl, { method: 'GET', signal: createTimeoutSignal(5000) })
        .then(res => res.text())
        .catch(err => {
          // Si es AbortError, significa que tocamos la puerta y nos fuimos. ¡Perfecto!
          if (err.name === 'AbortError') {
             logger.info('[KEEPALIVE] Python ping tocó la puerta (Timeout 5s esperado por Cold Start).');
          } else {
             logger.error('[KEEPALIVE] Python ping falló', err);
          }
        })
    );
  }

  if (goEngineUrl) {
    const goHealthUrl = goEngineUrl.replace('/api/v1/calcular-multa', '/health');
    logger.info(`[KEEPALIVE] Pinging Go Engine: ${goHealthUrl}`);
    pingPromises.push(
      fetch(goHealthUrl, { method: 'GET', signal: createTimeoutSignal(5000) })
        .then(res => res.text())
        .catch(err => {
          if (err.name === 'AbortError') {
             logger.info('[KEEPALIVE] Go ping tocó la puerta (Timeout 5s).');
          } else {
             logger.error('[KEEPALIVE] Go ping falló', err);
          }
        })
    );
  }

  await Promise.allSettled(pingPromises);
  logger.info('[KEEPALIVE] Pings completados/abortados con éxito.');
  
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
