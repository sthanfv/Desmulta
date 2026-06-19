import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createWorker } from 'tesseract.js';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { logger } from '@/lib/logger/security-logger';
import { apiError } from '@/lib/types/api-response';
import { OcrCircuitBreakerFs } from '@/lib/security/circuit-breaker-firestore';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

/**
 * API Route: /api/ocr
 *
 * Recibe una imagen en base64, la procesa con Google Gemini 1.5 Flash,
 * y devuelve el texto extraído para que simit-parser.ts lo analice.
 *
 * Seguridad:
 * - Rate limit: 5 llamadas por IP cada 10 minutos
 * - Validación de tipo MIME antes de enviar a Google
 * - La clave de Gemini nunca sale del servidor
 * - El payload se limita a 4MB (límite razonable para OCR)
 */

export const maxDuration = 60; // Permitir hasta 60 segundos en Vercel para dar espacio al fallback OCR

function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('[OCR] Credenciales de Gemini no configuradas (GEMINI_API_KEY)');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Usar flash-2.5 por ser el más rápido y óptimo para OCR multimodal en 2026
  return genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
}

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limit por IP + Fingerprint (Canvas Hash) para evitar bypass con VPN rotativas
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const fingerprint = request.headers.get('x-device-fingerprint') || 'no-fingerprint';
    const rateLimitKey = `${ip}_${fingerprint}`;

    const rateLimitStatus = await checkRateLimit('ocr', rateLimitKey);
    if (!rateLimitStatus.success) {
      return NextResponse.json(
        apiError('RATE_LIMITED', 'Demasiadas solicitudes. Espera 10 minutos.'),
        { status: 429 }
      );
    }

    // 1.5. Control de Costos FinOps: Cuota diaria global de procesamiento Gemini B2C
    const hoy = new Date().toISOString().split('T')[0];
    const redisDailyKey = `gemini:daily_usage:${hoy}`;

    let currentDailyUsage = 0;
    try {
      currentDailyUsage = (await redis.get<number>(redisDailyKey)) || 0;
    } catch (redisError) {
      logger.warn('[OCR] Error al leer límite diario de Redis (Fail-Safe: abierto)', { error: String(redisError) });
    }

    const MAX_DAILY_GEMINI = parseInt(process.env.MAX_DAILY_GEMINI || '1000');
    let usarTesseractDirectamente = false;

    if (currentDailyUsage >= MAX_DAILY_GEMINI) {
      logger.warn('[OCR] Cuota diaria de solicitudes Gemini excedida. Cayendo directamente a Tesseract.', { usage: currentDailyUsage, limite: MAX_DAILY_GEMINI });
      usarTesseractDirectamente = true;
    }

    // 2. Validar el body con Zod (estructura + tipos)
    const OcrBodySchema = z.object({
      imageBase64: z
        .string({ required_error: 'imageBase64 es requerido.' })
        .max(8_388_608, 'La imagen excede el límite de 4MB en base64.'),
      mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp'], {
        errorMap: () => ({ message: 'Tipo de imagen no permitido. Usar JPG, PNG o WebP.' }),
      }),
    });

    const parsedBody = OcrBodySchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json(
        apiError('VALIDATION_ERROR', 'Datos de entrada inválidos.', parsedBody.error.flatten()),
        { status: 400 }
      );
    }

    const { imageBase64, mimeType } = parsedBody.data;

    // 4. Llamar a Google Gemini con Timeout de 15s para evitar Vercel 504 Timeout y dar tiempo a Tesseract
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('OCR_TIMEOUT_15S')), 15000);
    });

    try {
      if (usarTesseractDirectamente) {
        throw new Error('GEMINI_QUOTA_EXCEEDED');
      }

      if (await OcrCircuitBreakerFs.isOpen()) {
        throw new Error('OCR_CIRCUIT_OPEN');
      }

      const model = getGeminiModel();
      // Prompt de extracción estructurada: Gemini devuelve JSON tipado directamente,
      // eliminando la dependencia del parser regex para el flujo principal.
      const prompt = `Eres un sistema experto en análisis de documentos de tránsito colombianos.
Analiza la imagen proporcionada y determina si es un comparendo, multa de tránsito, captura del SIMIT u otro documento oficial de tránsito colombiano.

PALABRAS CLAVE que identifican un documento válido: COMPARENDO, INFRACCION, SIMIT, REPUBLICA DE COLOMBIA, SECRETARIA, TRANSITO, RESOLUCION, MULTA, MANDAMIENTO, COBRO COACTIVO.

Si NO encuentras ninguna de estas palabras o el documento no es claramente de tránsito colombiano, devuelve EXACTAMENTE:
{"error":"NO_VALID_DOCUMENT"}

Si ES un documento válido, extrae TODOS los campos que puedas identificar y devuelve ÚNICAMENTE el siguiente JSON (sin texto adicional, sin markdown, sin explicaciones):
{
  "numeroComparendo": "número o código del comparendo (string o null)",
  "fechaInfraccion": "fecha en formato DD/MM/YYYY o null",
  "placa": "placa del vehículo en formato AAA123 o null",
  "codigoInfraccion": "código tipo C02, D04, etc. o null",
  "descripcionInfraccion": "descripción de la infracción o null",
  "valorMulta": número en pesos colombianos sin puntos ni comas o null,
  "nombreInfractor": "nombre completo o null",
  "cedulaInfractor": "número de cédula o null",
  "entidadEmisora": "nombre de la secretaría o entidad emisora o null",
  "ciudad": "ciudad o municipio o null",
  "esFotomulta": true o false,
  "tieneCobroCoactivo": true o false,
  "tieneMandamientoPago": true o false,
  "tieneResolucionSancionatoria": true o false,
  "fechaResolucion": "fecha de la resolución en DD/MM/YYYY o null",
  "textoCompleto": "todo el texto visible en el documento sin formato"
}

REGLAS CRÍTICAS:
- Devuelve SOLO el JSON, nada más.
- Si un campo no es visible o no aplica, usa null (no uses string vacío ni "N/A").
- El campo "textoCompleto" debe contener todo el texto visible sin omisiones.
- Para "valorMulta" usa solo el número entero en pesos (ej: 482200), no incluyas el símbolo $ ni puntos.
- Para "esFotomulta", "tieneCobroCoactivo", "tieneMandamientoPago", "tieneResolucionSancionatoria" usa true/false booleano.`;

      const imageParts = [
        {
          inlineData: {
            data: imageBase64,
            mimeType,
          },
        },
      ];

      // Compite Gemini contra el reloj de 25 segundos
      const result = await Promise.race([
        model.generateContent([prompt, ...imageParts]),
        timeoutPromise,
      ]);

      const response = await result.response;
      const rawRespuesta = response.text().trim();

      // Detectar rechazo de documento (JSON de error de Gemini)
      if (rawRespuesta === 'NO_VALID_DOCUMENT' || rawRespuesta.includes('"error":"NO_VALID_DOCUMENT"')) {
        logger.warn('[OCR] Imagen rechazada: no parece un documento de tránsito válido', { ip });
        return NextResponse.json(
          apiError(
            'INVALID_DOCUMENT',
            'La imagen no parece ser una multa o resolución válida. Intenta con otra foto más clara.'
          ),
          { status: 422 }
        );
      }

      if (!rawRespuesta) {
        logger.warn('[OCR] Gemini no detectó texto en la imagen', { ip });
        return NextResponse.json({ texto: '', palabras: [], comparendo: null });
      }

      // Intentar parsear el JSON estructurado devuelto por Gemini
      // El prompt pide JSON puro, pero por seguridad limpiamos posibles bloques markdown
      let comparendo: Record<string, unknown> | null = null;
      let textoCompleto = rawRespuesta;

      try {
        // Limpiar bloques markdown ``` si Gemini los incluye a pesar del prompt
        const jsonLimpio = rawRespuesta
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();
        const parsed = JSON.parse(jsonLimpio) as Record<string, unknown>;
        comparendo = parsed;
        // El campo textoCompleto del JSON es el texto para el motor legacy (PrescriptionEngine)
        textoCompleto = typeof parsed.textoCompleto === 'string' ? parsed.textoCompleto : rawRespuesta;
        logger.info('[OCR] Respuesta de Gemini parseada como JSON estructurado', {
          campos: Object.keys(parsed).join(', '),
        });
      } catch {
        // Si Gemini no devolvió JSON válido, tratamos la respuesta como texto crudo (modo legacy)
        logger.warn('[OCR] Gemini no devolvió JSON estructurado, usando modo texto crudo', {
          inicio: rawRespuesta.slice(0, 80),
        });
      }

      logger.info('[OCR] Procesamiento con Gemini exitoso', {
        caracteres: textoCompleto.length,
        modoEstructurado: comparendo !== null,
      });

      await OcrCircuitBreakerFs.recordSuccess();

      // Incrementar el contador global diario de Gemini de forma atómica en Redis
      try {
        const pipeline = redis.pipeline();
        pipeline.incr(redisDailyKey);
        pipeline.expire(redisDailyKey, 129600); // 36 horas de TTL (1.5 días)
        await pipeline.exec();
      } catch (redisIncrError) {
        logger.warn('[OCR] Error al incrementar límite diario de Gemini en Redis', { error: String(redisIncrError) });
      }

      return NextResponse.json({
        // Campo legacy: texto crudo para el flujo existente (simit-parser, PrescriptionEngine)
        texto: textoCompleto,
        palabras: [],
        proveedor: 'google-gemini-2.5-flash',
        // Campo nuevo: datos estructurados del comparendo (null si Gemini respondió en modo texto)
        comparendo,
      });
    } catch (geminiError) {
      const gMsg = geminiError instanceof Error ? geminiError.message : 'Error desconocido';

      // Si el error es por cuota de Gemini o circuito abierto, no registramos falla en el circuit breaker
      if (gMsg !== 'GEMINI_QUOTA_EXCEEDED' && gMsg !== 'OCR_CIRCUIT_OPEN') {
        await OcrCircuitBreakerFs.recordFailure(geminiError);
        logger.error('[OCR] Error al procesar imagen con Gemini, intentando fallback con Tesseract', {
          error: gMsg,
        });
      } else if (gMsg === 'GEMINI_QUOTA_EXCEEDED') {
        logger.warn('[OCR] Cuota diaria de Gemini alcanzada. Cayendo directamente a Tesseract (Fallback)...');
      } else {
        logger.warn('[OCR] Circuit Breaker de Gemini está ABIERTO. Cayendo a Tesseract (Fallback)...');
      }

      // Si el error fue por timeout, no vale la pena intentar Tesseract si Vercel está a punto de matarnos
      // Pero como aumentamos maxDuration a 60s, si el timeout fue de 15s, Tesseract (que toma 10s) sí alcanza a correr.
      if (gMsg.includes('OCR_TIMEOUT_15S')) {
        logger.warn('[OCR] Timeout de 15s alcanzado. Pasando a Tesseract...');
      }

      try {
        // Configurar Tesseract.js en el entorno Node.js
        const worker = await createWorker('spa');

        // Competir Tesseract contra el reloj restante (10s aprox si Gemini falló rápido)
        const tesseractTimeout = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('TESSERACT_TIMEOUT_10S')), 10000);
        });

        const dataUri = `data:${mimeType};base64,${imageBase64}`;

        const recognizeResult = await Promise.race([worker.recognize(dataUri), tesseractTimeout]);

        const {
          data: { text },
        } = recognizeResult;
        await worker.terminate();

        if (!text || text.trim().length === 0) {
          throw new Error('Tesseract no detectó texto');
        }

        logger.info('[OCR] Procesamiento con Tesseract exitoso (Fallback)', {
          caracteres: text.length,
        });

        return NextResponse.json({
          texto: text,
          palabras: [], // Mismo formato que Gemini
          proveedor: 'tesseract-js-fallback',
        });
      } catch (tesseractError) {
        const tMsg = tesseractError instanceof Error ? tesseractError.message : 'Error desconocido';
        logger.error('[OCR] Error al procesar imagen con Tesseract (Fallback fallido)', {
          error: tMsg,
        });

        throw new Error(`Fallback Tesseract falló: ${tMsg}. Error original Gemini: ${gMsg}`);
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('[OCR] Error general', { error: errorMsg });

    // 🚨 ENVIAR ALERTA A TELEGRAM ANTES DE MORIR
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (botToken && chatId) {
      const telegramText = `🚨 *ALERTA SIMIT (OCR FALLIDO)* 🚨\n\nEl sistema de extracción de texto falló o se agotó el tiempo (Timeout/503).\n\n*Diagnóstico:*\n\`${errorMsg}\`\n\n_El cliente recibió un error. Podría abandonar el embudo._`;
      fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: telegramText,
          parse_mode: 'Markdown',
        }),
      }).catch(() => {});
    }

    // Retornamos 503 para que el cliente sepa que es saturación temporal
    const statusCode = errorMsg.includes('Timeout') || errorMsg.includes('503') ? 503 : 500;
    const errorCode = statusCode === 503 ? 'OCR_TIMEOUT' : 'INTERNAL_ERROR';
    return NextResponse.json(
      apiError(
        errorCode,
        'Nuestros servidores de IA están temporalmente saturados por alta demanda. Por favor, intenta de nuevo en unos minutos.'
      ),
      { status: statusCode }
    );
  }
}
