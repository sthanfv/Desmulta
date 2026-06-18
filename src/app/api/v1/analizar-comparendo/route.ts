import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { logger } from '@/lib/logger/security-logger';
import { apiError } from '@/lib/types/api-response';
import {
  extraerComparendo,
  construirAnalisisCompleto,
} from '@/lib/legal/comparendo-extractor';

/**
 * API Route: POST /api/v1/analizar-comparendo
 *
 * Endpoint B2B unificado: recibe una imagen de comparendo y devuelve en una
 * sola llamada el análisis completo: OCR + datos del comparendo + dictamen
 * legal + cálculo financiero.
 *
 * Arquitectura del flujo:
 *   1. Recibe imagen en base64
 *   2. Envía a Gemini con prompt de extracción estructurada JSON
 *   3. Parsea el JSON del comparendo con Zod (ComparendoSchema)
 *   4. Ejecuta PrescriptionEngine con el texto completo extraído
 *   5. Calcula intereses y SMLMV
 *   6. Devuelve AnalisisComparendo completo
 *
 * Autenticación: Rate limit por IP. Fase 2 agrega API Key (X-Desmulta-Key).
 *
 * Seguridad:
 * - Rate limit: 3 llamadas por 10 minutos por IP (igual que /api/ocr)
 * - Validación Zod del input
 * - Datos PII nunca se registran en logs
 * - Imagen se procesa en memoria, no se persiste
 */

export const maxDuration = 60;

const AnalizarComparendoSchema = z.object({
  imageBase64: z
    .string({ required_error: 'La imagen en base64 es requerida.' })
    .max(8_388_608, 'La imagen excede el límite de 4MB en base64.'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp'], {
    errorMap: () => ({ message: 'Tipo de imagen no permitido. Usar JPG, PNG o WebP.' }),
  }),
});

function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('[analizar-comparendo] GEMINI_API_KEY no configurada.');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
}

const PROMPT_EXTRACCION_ESTRUCTURADA = `Eres un sistema experto en análisis de documentos de tránsito colombianos.
Analiza la imagen y determina si es un comparendo, multa, captura del SIMIT u otro documento oficial de tránsito colombiano.

PALABRAS CLAVE que identifican un documento válido: COMPARENDO, INFRACCION, SIMIT, REPUBLICA DE COLOMBIA, SECRETARIA, TRANSITO, RESOLUCION, MULTA, MANDAMIENTO, COBRO COACTIVO.

Si NO encuentras ninguna de estas palabras, devuelve EXACTAMENTE:
{"error":"NO_VALID_DOCUMENT"}

Si ES un documento válido, extrae TODOS los campos visibles y devuelve ÚNICAMENTE este JSON (sin texto adicional, sin markdown):
{
  "numeroComparendo": "número del comparendo o null",
  "fechaInfraccion": "DD/MM/YYYY o null",
  "placa": "placa en formato AAA123 o null",
  "codigoInfraccion": "código tipo C02, D04, etc. o null",
  "descripcionInfraccion": "descripción de la infracción o null",
  "valorMulta": número en pesos sin puntos o null,
  "nombreInfractor": "nombre completo o null",
  "cedulaInfractor": "número de cédula o null",
  "entidadEmisora": "nombre de la secretaría o entidad o null",
  "ciudad": "ciudad o municipio o null",
  "esFotomulta": true o false,
  "tieneCobroCoactivo": true o false,
  "tieneMandamientoPago": true o false,
  "tieneResolucionSancionatoria": true o false,
  "fechaResolucion": "DD/MM/YYYY o null",
  "textoCompleto": "todo el texto visible en el documento"
}

REGLAS: Devuelve SOLO el JSON. Usa null para campos no visibles. valorMulta es número entero sin $ ni puntos.`;

export async function POST(request: NextRequest) {
  // 1. Rate limit por IP (usa el mismo límite que /api/ocr: 3 req / 10 min)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rateLimitStatus = await checkRateLimit('ocr', ip);
  if (!rateLimitStatus.success) {
    return NextResponse.json(
      apiError('RATE_LIMITED', 'Demasiadas solicitudes. Espera 10 minutos.'),
      { status: 429 }
    );
  }

  try {
    // 2. Validar input
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        apiError('VALIDATION_ERROR', 'El cuerpo debe ser JSON válido.'),
        { status: 400 }
      );
    }

    const parsed = AnalizarComparendoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        apiError('VALIDATION_ERROR', 'Datos de entrada inválidos.', parsed.error.flatten()),
        { status: 400 }
      );
    }

    const { imageBase64, mimeType } = parsed.data;

    // 3. Llamar a Gemini con el prompt de extracción estructurada
    const model = getGeminiModel();

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('GEMINI_TIMEOUT_20S')), 20_000);
    });

    const result = await Promise.race([
      model.generateContent([
        PROMPT_EXTRACCION_ESTRUCTURADA,
        { inlineData: { data: imageBase64, mimeType } },
      ]),
      timeoutPromise,
    ]);

    const rawRespuesta = result.response.text().trim();

    // 4. Detectar rechazo de documento
    if (
      rawRespuesta === 'NO_VALID_DOCUMENT' ||
      rawRespuesta.includes('"error":"NO_VALID_DOCUMENT"')
    ) {
      logger.warn('[analizar-comparendo] Imagen rechazada: no es un documento de tránsito', { ip });
      return NextResponse.json(
        apiError(
          'INVALID_DOCUMENT',
          'La imagen no parece ser una multa o resolución de tránsito válida.'
        ),
        { status: 422 }
      );
    }

    // 5. Parsear el JSON estructurado de Gemini
    let parsedJSON: Record<string, unknown> | null = null;
    let textoCompleto = rawRespuesta;

    try {
      const jsonLimpio = rawRespuesta
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      parsedJSON = JSON.parse(jsonLimpio) as Record<string, unknown>;
      textoCompleto =
        typeof parsedJSON.textoCompleto === 'string' ? parsedJSON.textoCompleto : rawRespuesta;
    } catch {
      logger.warn('[analizar-comparendo] Gemini no devolvió JSON estructurado, usando modo texto', {
        inicio: rawRespuesta.slice(0, 80),
      });
    }

    // 6. Tipar el comparendo extraído
    const comparendo = extraerComparendo(parsedJSON);

    // 7. Construir el análisis completo (legal + financiero)
    const analisis = construirAnalisisCompleto(
      textoCompleto,
      comparendo,
      'google-gemini-2.5-flash',
      // Si Gemini devolvió JSON estructurado, asumimos alta confianza
      parsedJSON !== null ? 95 : 60
    );

    logger.info('[analizar-comparendo] Análisis completo generado', {
      estadoLegal: analisis.analisisLegal.estado,
      isViable: analisis.analisisLegal.isViable,
      modoEstructurado: analisis.ocr.modoEstructurado,
      tieneValorMulta: analisis.calculadora.valorOriginal !== null,
    });

    return NextResponse.json({ success: true, ...analisis }, { status: 200 });
  } catch (error: unknown) {
    const mensaje = error instanceof Error ? error.message : String(error);
    logger.error('[analizar-comparendo] Error general', { error: mensaje });

    if (mensaje.includes('GEMINI_TIMEOUT_20S')) {
      return NextResponse.json(
        apiError(
          'OCR_TIMEOUT',
          'El análisis de la imagen tomó demasiado tiempo. Intenta con una imagen más clara o de menor tamaño.'
        ),
        { status: 503 }
      );
    }

    return NextResponse.json(
      apiError('INTERNAL_ERROR', 'Error interno al analizar el comparendo.'),
      { status: 500 }
    );
  }
}
