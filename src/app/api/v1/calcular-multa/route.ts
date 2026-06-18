import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { logger } from '@/lib/logger/security-logger';
import { apiError } from '@/lib/types/api-response';
import { calcularMultaCompleta } from '@/lib/calculadora-legal';
import { determinarCausales } from '@/lib/legal/comparendo-extractor';

/**
 * API Route: POST /api/v1/calcular-multa
 *
 * Endpoint B2B que calcula el dictamen legal y financiero completo de una multa
 * a partir de su valor y fecha, sin necesidad de imagen.
 *
 * Casos de uso:
 * - Empresas de flotas que ya conocen el valor de la multa y la fecha
 * - Integraciones con sistemas externos que necesitan el dictamen en JSON
 * - Pruebas de la API B2B sin imagen
 *
 * Autenticación: Por ahora usa rate limit por IP (igual que el resto de la app).
 * En la siguiente fase se agrega autenticación por API Key (X-Desmulta-Key).
 *
 * Seguridad:
 * - Rate limit: 20 llamadas por minuto por IP
 * - Validación Zod de todos los campos de entrada
 * - Sin PII en los logs (no se registra nombre ni cédula)
 */

/** Schema de validación de entrada */
const CalcularMultaSchema = z.object({
  /**
   * Valor nominal original de la multa en pesos colombianos.
   * Si no se conoce, se puede enviar 0 y la calculadora solo devolverá el análisis legal.
   */
  valorMulta: z
    .number({ required_error: 'El valor de la multa es requerido.' })
    .min(0, 'El valor de la multa no puede ser negativo.')
    .max(50_000_000, 'El valor supera el máximo permitido para una multa de tránsito.'),

  /**
   * Fecha de la infracción en formato ISO: YYYY-MM-DD
   * Ej: "2021-03-15"
   */
  fechaInfraccion: z
    .string({ required_error: 'La fecha de infracción es requerida.' })
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      'Formato de fecha inválido. Use YYYY-MM-DD (ej: 2021-03-15).'
    ),

  /**
   * Indica si el caso tiene cobro coactivo activo.
   * Si es true, el horizonte de prescripción se amplía a 6 años (T-645/2017).
   */
  tieneCobroCoactivo: z.boolean().default(false),

  /**
   * Texto OCR del documento (opcional).
   * Si se envía, enriquece el análisis legal con el PrescriptionEngine completo
   * (detección de fotomultas, mandamientos de pago, resoluciones, etc.)
   */
  textoOCR: z.string().max(20_000, 'El texto OCR no puede superar los 20.000 caracteres.').optional(),
});

export async function POST(request: NextRequest) {
  // 1. Rate limit por IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rateLimitStatus = await checkRateLimit('leads', ip); // Reutilizamos el limiter más permisivo
  if (!rateLimitStatus.success) {
    return NextResponse.json(
      apiError('RATE_LIMITED', 'Demasiadas solicitudes. Espera unos minutos.'),
      { status: 429 }
    );
  }

  try {
    // 2. Parsear y validar el cuerpo
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

    const { valorMulta, fechaInfraccion, tieneCobroCoactivo, textoOCR } = parsed.data;

    // 3. Ejecutar el cálculo completo
    const resultado = calcularMultaCompleta(
      valorMulta,
      fechaInfraccion,
      tieneCobroCoactivo,
      textoOCR ?? ''
    );

    // 4. Agregar causales legales aplicables
    const causales = determinarCausales(resultado.prescripcion.estadoLegal, null);

    logger.info('[calcular-multa] Cálculo ejecutado', {
      estadoLegal: resultado.prescripcion.estadoLegal,
      isViable: resultado.prescripcion.isViable,
      tieneCobroCoactivo,
    });

    // 5. Construir respuesta enriquecida
    return NextResponse.json(
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
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const mensaje = error instanceof Error ? error.message : String(error);
    logger.error('[calcular-multa] Error al calcular', { error: mensaje });

    // Errores de validación del motor (fecha fuera de rango, etc.)
    if (mensaje.includes('Fecha fuera de rango') || mensaje.includes('Formato de fecha')) {
      return NextResponse.json(apiError('VALIDATION_ERROR', mensaje), { status: 400 });
    }

    return NextResponse.json(
      apiError('INTERNAL_ERROR', 'Error interno al procesar el cálculo. Intenta de nuevo.'),
      { status: 500 }
    );
  }
}
