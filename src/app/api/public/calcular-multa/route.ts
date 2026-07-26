import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/security/rate-limit';
import crypto from 'crypto';
import { z } from 'zod';

/**
 * Schema de validación para el proxy público de la calculadora.
 *
 * 🛡️ FIX HALLAZGO #6: Valida y filtra el body antes de reenviarlo al motor Go.
 * Previene Mass Assignment y Parameter Pollution al pasar solo campos conocidos.
 */
const ProxySchema = z.object({
  valorMulta: z.number().min(0).max(100_000_000),
  fechaInfraccion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tieneCobroCoactivo: z.boolean().default(false),
  tipoInfraccion: z.string().max(5).default(''),
});

export async function GET() {
  // Endpoint ligero para despertar al contenedor de Go en Render (Pre-warming)
  try {
    const engineUrl = process.env.GO_ENGINE_URL;
    if (engineUrl) {
      // Intentar despertar con un endpoint ligero (health o root)
      const healthUrl = engineUrl.replace('/api/v1/calcular-multa', '/health');
      fetch(healthUrl).catch(() => {});
    }
    return NextResponse.json({ status: 'warmed_up' }, { status: 200 });
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // 🛡️ SEGURIDAD: Rate Limiter (Evita DDoS y spam hacia el motor de Go)
    const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
    const rateLimit = await checkRateLimit('consultation', ip);

    if (rateLimit.blocked) {
      return NextResponse.json(
        { error: 'Demasiadas consultas. Por favor espera un momento e inténtalo de nuevo.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.resetTime) } }
      );
    }

    const rawBody = await request.json();

    // 🛡️ FIX HALLAZGO #6: Validar y filtrar antes de reenviar al motor Go
    const parsed = ProxySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos para el cálculo.' },
        { status: 400 }
      );
    }

    // 🛡️ FIX HALLAZGO #1 + #10: Sin fallbacks hardcodeados. Fail-Closed si falta configuración.
    const engineUrl = process.env.GO_ENGINE_URL;
    const secretToken = process.env.GO_ENGINE_SECRET;

    if (!engineUrl || !secretToken) {
      console.error(
        '[calcular-multa proxy] CRÍTICO: GO_ENGINE_URL o GO_ENGINE_SECRET no configurados.'
      );
      return NextResponse.json(
        { error: 'Servicio de cálculo no disponible temporalmente.' },
        { status: 503 }
      );
    }

    const bodyStr = JSON.stringify(parsed.data);
    const timestamp = Date.now().toString();
    const signature = crypto
      .createHmac('sha256', secretToken)
      .update(timestamp + bodyStr)
      .digest('hex');

    const goResponse = await fetch(engineUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Engine-Timestamp': timestamp,
        'X-Engine-Signature': signature,
      },
      body: bodyStr,
    });

    if (!goResponse.ok) {
      // 🛡️ FIX HALLAZGO #4: No revelar detalles internos al cliente.
      console.error(`[calcular-multa proxy] Motor Go respondió HTTP ${goResponse.status}`);
      return NextResponse.json(
        { error: 'Error temporal al procesar el cálculo. Intenta nuevamente en unos segundos.' },
        { status: 502 }
      );
    }

    const goJson = await goResponse.json();

    // Retornamos directamente lo que dijo Go
    return NextResponse.json(goJson, { status: 200 });
  } catch (error: unknown) {
    // 🛡️ FIX HALLAZGO #4: Registrar el error internamente, nunca exponerlo al cliente.
    const mensaje = error instanceof Error ? error.message : String(error);
    console.error('[calcular-multa proxy] Error interno:', mensaje);
    return NextResponse.json(
      { error: 'Error temporal al procesar el cálculo. Intenta nuevamente en unos segundos.' },
      { status: 500 }
    );
  }
}
