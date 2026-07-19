import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Redis } from '@upstash/redis';
import { Client as QStashClient } from '@upstash/qstash';

const redis = Redis.fromEnv();
const MAX_GEMINI_DAILY = 500; // Límite de seguridad

import { logger } from '@/lib/logger/security-logger';
import { apiError } from '@/lib/types/api-response';
import { extraerComparendos, construirAnalisisCompleto } from '@/lib/legal/comparendo-extractor';
import { validateApiKey, API_KEY_HEADER, handleApiKeyError } from '@/lib/security/api-key-guard';
import { validateWebhookUrl } from '@/lib/security/ssrf-guard';
import { PROMPT_EXTRACCION_ESTRUCTURADA_SINGLE } from '@/lib/ai/gemini-prompts';

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

const AnalizarComparendoSchema = z
  .object({
    imageBase64: z
      .string({ required_error: 'La imagen en base64 es requerida.' })
      .max(8_388_608, 'La imagen excede el límite de 4MB en base64.'),
    mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp'], {
      errorMap: () => ({ message: 'Tipo de imagen no permitido. Usar JPG, PNG o WebP.' }),
    }),
    webhookUrl: z
      .string()
      .url('El webhook debe ser una URL válida.')
      .optional()
      .superRefine((val, ctx) => {
        if (!val) return;
        try {
          validateWebhookUrl(val);
        } catch (e) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: (e as Error).message,
          });
        }
      }),
  })
  .refine(
    (data) => {
      try {
        const headerBase64 = data.imageBase64.substring(0, 30);
        const headerBytes = Buffer.from(headerBase64, 'base64');
        const isJpeg =
          headerBytes[0] === 0xff && headerBytes[1] === 0xd8 && headerBytes[2] === 0xff;
        const isPng =
          headerBytes[0] === 0x89 &&
          headerBytes[1] === 0x50 &&
          headerBytes[2] === 0x4e &&
          headerBytes[3] === 0x47;
        const isWebp = headerBytes.slice(8, 12).toString('ascii') === 'WEBP';

        if (data.mimeType === 'image/jpeg') return isJpeg;
        if (data.mimeType === 'image/png') return isPng;
        if (data.mimeType === 'image/webp') return isWebp;
        return false;
      } catch {
        return false;
      }
    },
    {
      message: 'El contenido del archivo no corresponde al mimeType declarado.',
      path: ['imageBase64'],
    }
  );

function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('[analizar-comparendo] GEMINI_API_KEY no configurada.');
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
}

const PROMPT_EXTRACCION_ESTRUCTURADA = PROMPT_EXTRACCION_ESTRUCTURADA_SINGLE;

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
    return NextResponse.json(apiError('VALIDATION_ERROR', 'El cuerpo debe ser JSON válido.'), {
      status: 400,
    });
  }

  const parsed = AnalizarComparendoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      apiError('VALIDATION_ERROR', 'Datos de entrada inválidos.', parsed.error.flatten()),
      { status: 400 }
    );
  }

  const { imageBase64, mimeType, webhookUrl } = parsed.data;

  // ══════════════════════════════════════════════════════════════════════
  // CAPA 2.5: Enrutamiento Asíncrono (QStash)
  // ══════════════════════════════════════════════════════════════════════
  if (webhookUrl) {
    const qstashToken = process.env.QSTASH_TOKEN;
    if (!qstashToken) {
      logger.error('[analizar-comparendo] QSTASH_TOKEN no configurada — fallback sincrónico');
    } else {
      try {
        const qstash = new QStashClient({ token: qstashToken });
        const currentHost = request.headers.get('host') || 'desmulta.online';
        const protocol = currentHost.includes('localhost') ? 'http' : 'https';

        const message = await qstash.publishJSON({
          url: `${protocol}://${currentHost}/api/qstash/ocr-worker`,
          body: {
            imageBase64,
            mimeType,
            webhookUrl,
            plan: authResult.keyDoc?.plan,
          },
        });

        const response = NextResponse.json(
          {
            success: true,
            message: 'Análisis encolado exitosamente. Se notificará al webhookUrl proporcionado.',
            jobId: message.messageId,
            status: 'processing',
          },
          { status: 202 }
        );

        response.headers.set('X-RateLimit-Remaining-Month', String(authResult.remainingMonth ?? 0));
        response.headers.set(
          'X-RateLimit-Remaining-Minute',
          String(authResult.remainingMinute ?? 0)
        );

        return response;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error('[analizar-comparendo] Error al encolar en QStash', { error: msg });
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // CAPA 3: OCR con Gemini (Modo Sincrónico Legacy)
  // ══════════════════════════════════════════════════════════════════════
  try {
    const dateStr = new Date().toISOString().split('T')[0];
    const dailyCount = await redis.incr(`gemini:daily:${dateStr}`);
    if (dailyCount === 1) await redis.expire(`gemini:daily:${dateStr}`, 86400);

    if (dailyCount > MAX_GEMINI_DAILY) {
      logger.error('[analizar-comparendo] CUOTA DIARIA DE GEMINI EXCEDIDA', { dailyCount });
      return NextResponse.json(
        apiError(
          'INTERNAL_ERROR',
          'Servicio temporalmente saturado. Intenta de nuevo más tarde o mañana.'
        ),
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
      rawRespuesta.includes('"error":"NO_VALID_DOCUMENT"') ||
      rawRespuesta === 'PROMPT_INJECTION_DETECTED' ||
      rawRespuesta.includes('"error":"PROMPT_INJECTION_DETECTED"')
    ) {
      return NextResponse.json(
        apiError(
          'INVALID_DOCUMENT',
          'La imagen no parece ser una multa de tránsito válida o contiene instrucciones no permitidas.'
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

    const comparendos = extraerComparendos(parsedJSON);

    let resultados = [];
    if (comparendos.length === 0) {
      resultados = [
        construirAnalisisCompleto(
          textoCompleto,
          null,
          'google-gemini-2.5-flash',
          parsedJSON !== null ? 95 : 60
        ),
      ];
    } else {
      resultados = comparendos.map((comp) =>
        construirAnalisisCompleto(textoCompleto, comp, 'google-gemini-2.5-flash', 95)
      );
    }

    logger.info('[analizar-comparendo] Análisis completo generado', {
      plan: authResult.keyDoc?.plan,
      cantidadResultados: resultados.length,
      modoEstructurado: resultados[0].ocr.modoEstructurado,
    });

    const response = NextResponse.json(
      {
        success: true,
        resultados,
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
