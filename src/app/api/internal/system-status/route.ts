import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

export const runtime = 'edge';

// 🛡️ AUDITORÍA 2026-08-01: Health Check Unificado (X-03)
export async function GET(request: Request) {
  // 🛡️ Autenticación: Solo llamadores internos autorizados
  const authHeader = request.headers.get('authorization');
  const secret = process.env.INTERNAL_API_SECRET || process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'No configurado' }, { status: 500 });
  }
  const expected = Buffer.from(`Bearer ${secret}`);
  const provided = Buffer.from(authHeader ?? '');
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const goEngineUrl = process.env.GO_ENGINE_URL;
  const ocrFallbackUrl = process.env.OCR_FALLBACK_URL;

  const results = {
    nextjs: { status: 'OK', timestamp: new Date().toISOString() },
    go_engine: { status: 'UNKNOWN', error: null as string | null },
    python_ocr: { status: 'UNKNOWN', error: null as string | null },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

  try {
    const promises = [];

    if (goEngineUrl) {
      promises.push(
        fetch(`${goEngineUrl}/healthz`, { signal: controller.signal })
          .then((res) => {
            results.go_engine.status = res.ok ? 'OK' : 'ERROR';
          })
          .catch((err) => {
            results.go_engine.status = 'ERROR';
            results.go_engine.error = err.message;
          })
      );
    }

    if (ocrFallbackUrl) {
      promises.push(
        fetch(`${ocrFallbackUrl}/health`, { signal: controller.signal })
          .then((res) => {
            results.python_ocr.status = res.ok ? 'OK' : 'ERROR';
          })
          .catch((err) => {
            results.python_ocr.status = 'ERROR';
            results.python_ocr.error = err.message;
          })
      );
    }

    await Promise.allSettled(promises);
    clearTimeout(timeoutId);

    const allOk =
      (results.go_engine.status === 'OK' || results.go_engine.status === 'UNKNOWN') &&
      (results.python_ocr.status === 'OK' || results.python_ocr.status === 'UNKNOWN');

    return NextResponse.json(results, { status: allOk ? 200 : 503 });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Fallo al verificar estado de los subsistemas', details: errMsg },
      { status: 500 }
    );
  }
}
