import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { logger } from '@/lib/logger/security-logger';

/**
 * 🛡️ AUDITORÍA 2026-08-01: E-NX-01 - Monitoreo de Costos FinOps
 * Cron job destinado a ejecutarse semanalmente para monitorear el gasto de Firestore y Upstash.
 * Debe configurarse en vercel.json con un schedule "0 9 * * 1" (Lunes 9 AM).
 */
export async function GET(request: Request) {
  // Validación de seguridad para Vercel Cron
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    logger.error('[FinOps] CRON_SECRET no configurado');
    return new NextResponse('Server Error', { status: 500 });
  }
  const expected = Buffer.from(`Bearer ${cronSecret}`);
  const provided = Buffer.from(authHeader ?? '');
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    logger.info('[FinOps] Ejecutando análisis semanal de costos y métricas...');

    // Pendiente: Integración con métricas de costos. Ver ticket interno DES-FIN-01.

    // Simulación de envío de alerta si se supera un umbral ficticio (80%)
    const umbralSuperado = false;

    if (umbralSuperado) {
      const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;

      if (telegramToken && chatId) {
        const msg = encodeURIComponent(
          '⚠️ *ALERTA FINOPS* ⚠️\nEl consumo de Firestore se acerca al límite gratuito mensual (80%). Revisa la cuota.'
        );
        await fetch(
          `https://api.telegram.org/bot${telegramToken}/sendMessage?chat_id=${chatId}&text=${msg}&parse_mode=Markdown`
        );
      }
    }

    return NextResponse.json({ status: 'success', checked: true });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error('[FinOps] Error al ejecutar cron:', { error: errMsg });
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
