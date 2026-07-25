import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { logger } from '@/lib/logger/security-logger';
import { apiError } from '@/lib/types/api-response';

import { determinarCausales } from '@/lib/legal/comparendo-extractor';
import { validateApiKey, API_KEY_HEADER, handleApiKeyError } from '@/lib/security/api-key-guard';

/**
 * API Route: POST /api/v1/calcular-multa
 *
 * Endpoint B2B que calcula el dictamen legal y financiero completo de una multa
 * a partir de su valor y fecha, sin necesidad de imagen.
 *
 * Autenticación: Header obligatorio `X-Desmulta-Key: dm_live_...`
 *
 * Planes:
 * - Starter:    500 req/mes · 10 req/min
 * - Growth:    5.000 req/mes · 30 req/min
 * - Enterprise: 50.000 req/mes · 100 req/min
 *
 * Seguridad:
 * - 9 capas de validación en api-key-guard.ts
 * - Sin PII en logs (no se registra nombre ni cédula)
 * - Rate limit por plan via Upstash Redis
 * - Quota mensual controlada en Firestore
 */

export const maxDuration = 10;

/** Schema de validación de entrada */
const CalcularMultaSchema = z.object({
  /**
   * Valor nominal original de la multa en pesos colombianos.
   * Si no se conoce, enviar 0 para obtener solo el análisis legal.
   */
  valorMulta: z
    .number({ required_error: 'El valor de la multa es requerido.' })
    .min(0, 'El valor de la multa no puede ser negativo.')
    .max(50_000_000, 'El valor supera el máximo permitido para una multa de tránsito.'),

  /**
   * Fecha de la infracción en formato ISO: YYYY-MM-DD
   */
  fechaInfraccion: z
    .string({ required_error: 'La fecha de infracción es requerida.' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido. Use YYYY-MM-DD (ej: 2021-03-15).'),

  /**
   * Indica si el caso tiene cobro coactivo activo.
   * Si es true, el horizonte de prescripción se amplía a 6 años (T-645/2017).
   */
  tieneCobroCoactivo: z.boolean().default(false),

  /**
   * Texto OCR del documento (opcional).
   * Enriquece el análisis legal con detección de fotomultas, mandamientos, etc.
   */
  textoOCR: z
    .string()
    .max(20_000, 'El texto OCR no puede superar los 20.000 caracteres.')
    .optional(),
});


export async function POST(request: NextRequest) {
  // ══════════════════════════════════════════════════════════════════════
  // CAPA 1: Autenticación por API Key (9 sub-capas internas)
  // ══════════════════════════════════════════════════════════════════════
  const rawKey = request.headers.get(API_KEY_HEADER);
  const authResult = await validateApiKey(rawKey);

  if (!authResult.valid) return handleApiKeyError(authResult);

  // ══════════════════════════════════════════════════════════════════════
  // CAPA 2: Validación de entrada
  // ══════════════════════════════════════════════════════════════════════
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      apiError('VALIDATION_ERROR', 'El cuerpo de la solicitud debe ser JSON válido.'),
      { status: 400 }
    );
  }

  const parsed = CalcularMultaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      apiError('VALIDATION_ERROR', 'Datos de entrada inválidos.', parsed.error.flatten()),
      { status: 400 }
    );
  }

  const { valorMulta, fechaInfraccion, tieneCobroCoactivo } = parsed.data;

  // ══════════════════════════════════════════════════════════════════════
  // CAPA 3: Ejecución del cálculo
  // ══════════════════════════════════════════════════════════════════════
  try {
    // 🛡️ FIX HALLAZGO #2: Conexión segura al microservicio Go.
    // - URL y token leídos desde variables de entorno (Fail-Closed).
    // - Se incluye X-Engine-Token para autenticación S2S.
    const engineUrl = process.env.GO_ENGINE_URL;
    const engineSecret = process.env.GO_ENGINE_SECRET;

    if (!engineUrl || !engineSecret) {
      logger.error(
        '[calcular-multa B2B] CRÍTICO: GO_ENGINE_URL o GO_ENGINE_SECRET no configurados.'
      );
      return NextResponse.json(
        apiError('INTERNAL_ERROR', 'Motor de cálculo no disponible temporalmente.'),
        { status: 503 }
      );
    }

    const bodyStr = JSON.stringify({
      valorMulta,
      fechaInfraccion,
      tieneCobroCoactivo,
    });

    const timestamp = Date.now().toString();
    const signature = crypto
      .createHmac('sha256', engineSecret)
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
      throw new Error(`El motor de Golang falló o está apagado (HTTP ${goResponse.status})`);
    }

    const goJson = await goResponse.json();
    const resultado = goJson.data; // Go devuelve exactamente la misma interfaz en 'data'
    // --- FIN DE CONEXIÓN A GO ---

    const causales = determinarCausales(resultado.prescripcion.estadoLegal, null);

    logger.info('[calcular-multa] Cálculo ejecutado', {
      plan: authResult.keyDoc?.plan,
      estadoLegal: resultado.prescripcion.estadoLegal,
      isViable: resultado.prescripcion.isViable,
    });

    const response = NextResponse.json(
      {
        success: true,
        analisisLegal: {
          estado: resultado.prescripcion.estadoLegal,
          estadoUI: resultado.prescripcion.estado,
          isViable: resultado.prescripcion.isViable,
          tiempoTranscurrido: resultado.prescripcion.tiempoTranscurrido,
          diasTotales: resultado.prescripcion.diasTotales,
          porcentajeCaducidad: resultado.prescripcion.porcentajeCaducidad,
          dictamenTecnico: resultado.prescripcion.disclaimerLegal,
          causalesAplicables: causales,
        },
        financiero: resultado.financiero,
        _meta: {
          plan: authResult.keyDoc?.plan,
          remainingMonth: authResult.remainingMonth,
          remainingMinute: authResult.remainingMinute,
        },
      },
      { status: 200 }
    );

    // Cabeceras informativas de quota (estilo estándar de APIs profesionales)
    response.headers.set('X-RateLimit-Remaining-Month', String(authResult.remainingMonth ?? 0));
    response.headers.set('X-RateLimit-Remaining-Minute', String(authResult.remainingMinute ?? 0));

    return response;
  } catch (error: unknown) {
    const mensaje = error instanceof Error ? error.message : String(error);
    logger.error('[calcular-multa] Error al calcular', { error: mensaje });

    if (mensaje.includes('Fecha fuera de rango') || mensaje.includes('Formato de fecha')) {
      return NextResponse.json(apiError('VALIDATION_ERROR', mensaje), { status: 400 });
    }

    return NextResponse.json(
      apiError('INTERNAL_ERROR', 'Error interno al procesar el cálculo. Intenta de nuevo.'),
      { status: 500 }
    );
  }
}
