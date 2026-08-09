import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger/security-logger';
import { upsertSubscription } from '@/lib/data/simit-subscriptions';
import { resend } from '@/lib/resend';
import { buildEscudoSimitEmail } from '@/lib/email-templates/simit-alert';

/**
 * POST /api/escudo-simit/activate
 *
 * Activa el Escudo SIMIT para un usuario:
 * 1. Valida Turnstile.
 * 2. Registra la suscripción en Firestore.
 * 3. Dispara la primera consulta al scraper en Cloud Run.
 * 4. Envía email de bienvenida con resultados.
 * 5. Retorna los datos al frontend.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cedula, email, turnstileToken, pushToken } = body;

    // ── Validación de entrada ──────────────────────────────────────
    if (!cedula || typeof cedula !== 'string' || !/^\d{5,12}$/.test(cedula)) {
      return NextResponse.json(
        { error: 'Cédula inválida. Debe contener entre 5 y 12 dígitos.' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Email inválido.' },
        { status: 400 }
      );
    }

    // ── Validar Turnstile (Anti-Bot) ───────────────────────────────
    if (!turnstileToken) {
      return NextResponse.json(
        { error: 'Verificación anti-bot requerida.' },
        { status: 400 }
      );
    }

    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    if (turnstileSecret) {
      const turnstileResponse = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `secret=${turnstileSecret}&response=${turnstileToken}`,
        }
      );
      const turnstileData = await turnstileResponse.json();
      if (!turnstileData.success) {
        logger.warn('[escudo-simit] Turnstile rechazado', { cedula });
        return NextResponse.json(
          { error: 'Verificación anti-bot fallida. Recarga la página.' },
          { status: 403 }
        );
      }
    }

    logger.info('[escudo-simit] Activación solicitada', { cedula, email });

    // ── Registrar suscripción en Firestore ──────────────────────────
    await upsertSubscription({
      cedula,
      email,
      isActive: true,
      ...(pushToken ? { pushToken } : {}),
    });

    // ── Consultar el scraper en Cloud Run (Primera consulta) ────────
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
      body: JSON.stringify({ cedulas: [cedula] }),
    });

    if (!scraperResponse.ok) {
      const errText = await scraperResponse.text();
      throw new Error(`Error del scraper: ${scraperResponse.status} - ${errText}`);
    }

    const scraperData = await scraperResponse.json();

    if (!scraperData.success || !scraperData.results?.[0]?.success) {
      throw new Error('El scraper no pudo extraer los datos del SIMIT.');
    }

    const resultado = scraperData.results[0].data;

    // ── Enviar email de bienvenida con resultados ───────────────────
    try {
      const emailHtml = buildEscudoSimitEmail(cedula, resultado);
      await resend.emails.send({
        from: 'Desmulta Escudo SIMIT <alerta@desmulta.online>',
        to: email,
        subject: `🛡️ Escudo SIMIT Activado — ${resultado.resumen.totalMultas} multa(s) detectada(s)`,
        html: emailHtml,
      });
      logger.info('[escudo-simit] Email de bienvenida enviado', { email });
    } catch (emailError) {
      // No bloqueamos si el email falla — el usuario ya tiene los datos en pantalla
      logger.warn('[escudo-simit] Fallo al enviar email de bienvenida', {
        error: emailError instanceof Error ? emailError.message : String(emailError),
      });
    }

    return NextResponse.json({
      success: true,
      data: resultado,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('[escudo-simit] Error en activación', { error: msg });
    return NextResponse.json(
      { error: 'Error interno al activar el Escudo SIMIT.', detail: msg },
      { status: 500 }
    );
  }
}
