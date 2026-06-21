import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const MAX_GEMINI_DAILY = 500; // Límite de seguridad

import { logger } from '@/lib/logger/security-logger';
import { apiError } from '@/lib/types/api-response';
import {
  extraerComparendo,
  construirAnalisisCompleto,
} from '@/lib/legal/comparendo-extractor';
import { validateApiKey, API_KEY_HEADER, handleApiKeyError } from '@/lib/security/api-key-guard';

/**
 * API Route: POST /api/v1/analizar-comparendo
 *
 * Endpoint B2B unificado: recibe una imagen de comparendo y devuelve en una
 * sola llamada el análisis completo: OCR + datos del comparendo + dictamen
 * legal + cálculo financiero.
 *
 * Autenticación: Header obligatorio `X-Desmulta-Key: dm_live_...`
 *
 * Planes:
 * - Starter:     500 req/mes · 10 req/min
 * - Growth:     5.000 req/mes · 30 req/min
 * - Enterprise: 50.000 req/mes · 100 req/min
 *
 * Seguridad:
 * - 9 capas de validación en api-key-guard.ts
 * - Cabeceras X-RateLimit para gestión de quota por el cliente
 * - Sin almacenamiento de imágenes: procesamiento 100% en memoria
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
  if (!apiKey) throw new Error('[analizar-comparendo] GEMINI_API_KEY no configurada.');
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
  // ══════════════════════════════════════════════════════════════════════
  // CAPA 1: Autenticación por API Key
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

  // ══════════════════════════════════════════════════════════════════════
  // CAPA 3: OCR con Gemini
  // ══════════════════════════════════════════════════════════════════════
  try {
    const dateStr = new Date().toISOString().split('T')[0];
    const dailyCount = await redis.incr(`gemini:daily:${dateStr}`);
    if (dailyCount === 1) await redis.expire(`gemini:daily:${dateStr}`, 86400);

    if (dailyCount > MAX_GEMINI_DAILY) {
      logger.error('[analizar-comparendo] CUOTA DIARIA DE GEMINI EXCEDIDA', { dailyCount });
      return NextResponse.json(
        apiError('INTERNAL_ERROR', 'Servicio temporalmente saturado. Intenta de nuevo más tarde o mañana.'),
        { status: 503 }
      );
    }

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

    // Detectar rechazo de documento
    if (
      rawRespuesta === 'NO_VALID_DOCUMENT' ||
      rawRespuesta.includes('"error":"NO_VALID_DOCUMENT"')
    ) {
      return NextResponse.json(
        apiError(
          'INVALID_DOCUMENT',
          'La imagen no parece ser una multa o resolución de tránsito válida.'
        ),
        { status: 422 }
      );
    }

    // Parsear el JSON estructurado de Gemini
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
      logger.warn('[analizar-comparendo] Gemini devolvió texto crudo (modo legacy)', {
        inicio: rawRespuesta.slice(0, 80),
      });
    }

    const comparendo = extraerComparendo(parsedJSON);

    const analisis = construirAnalisisCompleto(
      textoCompleto,
      comparendo,
      'google-gemini-2.5-flash',
      parsedJSON !== null ? 95 : 60
    );

    logger.info('[analizar-comparendo] Análisis completo generado', {
      plan: authResult.keyDoc?.plan,
      estadoLegal: analisis.analisisLegal.estado,
      isViable: analisis.analisisLegal.isViable,
      modoEstructurado: analisis.ocr.modoEstructurado,
    });

    const response = NextResponse.json(
      {
        success: true,
        ...analisis,
        _meta: {
          plan: authResult.keyDoc?.plan,
          remainingMonth: authResult.remainingMonth,
          remainingMinute: authResult.remainingMinute,
        },
      },
      { status: 200 }
    );

    response.headers.set('X-RateLimit-Remaining-Month', String(authResult.remainingMonth ?? 0));
    response.headers.set('X-RateLimit-Remaining-Minute', String(authResult.remainingMinute ?? 0));

    return response;
  } catch (error: unknown) {
    const mensaje = error instanceof Error ? error.message : String(error);
    logger.error('[analizar-comparendo] Error general', { error: mensaje });

    if (mensaje.includes('GEMINI_TIMEOUT_20S')) {
      return NextResponse.json(
        apiError(
          'OCR_TIMEOUT',
          'El análisis tomó demasiado tiempo. Intenta con una imagen más clara o de menor tamaño.'
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
