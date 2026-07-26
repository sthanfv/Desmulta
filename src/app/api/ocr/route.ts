import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { logger } from '@/lib/logger/security-logger';
import { apiError } from '@/lib/types/api-response';
import { OcrCircuitBreakerFs } from '@/lib/security/circuit-breaker-firestore';
import { Redis } from '@upstash/redis';
import { PROMPT_EXTRACCION_ESTRUCTURADA_STRICT } from '@/lib/ai/gemini-prompts';
import { adminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

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
  // Usar flash-1.5 por ser el más estable y óptimo para OCR multimodal
  return genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
}

export async function GET() {
  // Endpoint ligero para despertar al contenedor de Render (Pre-warming)
  try {
    const ocrFallbackUrl = process.env.OCR_FALLBACK_URL;
    if (ocrFallbackUrl) {
      // Reemplaza /api/v1/extract por /health para hacer el ping
      const healthUrl = ocrFallbackUrl.replace('/api/v1/extract', '/health');
      // No hacemos await para no bloquear, o hacemos un fetch muy rápido
      fetch(healthUrl).catch(() => {});
    }
    return NextResponse.json({ status: 'warmed_up' }, { status: 200 });
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { getSecureIp } = await import('@/lib/security/ip-utils');
    const ip = getSecureIp(request);
    const fingerprint = request.headers.get('x-device-fingerprint') || 'no-fingerprint';

    // 🛡️ El Rate Limit DEBE basarse estrictamente en la IP.
    // Combinarlo con fingerprint permite a un atacante multiplicar su cuota.
    const rateLimitKey = ip;
    logger.info('[OCR] Nueva request de OCR', { ip, fingerprint });

    const rateLimitStatus = await checkRateLimit('ocr', rateLimitKey);
    if (!rateLimitStatus.success) {
      const waitMs = rateLimitStatus.resetTime - Date.now();
      const waitSec = Math.max(0, Math.ceil(waitMs / 1000));
      return NextResponse.json(
        apiError(
          'RATE_LIMITED',
          `¡Has alcanzado el límite de escaneos de seguridad! Por favor, intenta de nuevo en ${waitSec} segundos.`
        ),
        { status: 429, headers: { 'Retry-After': String(waitSec) } }
      );
    }

    // 1.5. Control de Costos FinOps: Cuota diaria global de procesamiento Gemini B2C
    const hoy = new Date().toISOString().split('T')[0];
    const redisDailyKey = `gemini:daily:${hoy}`;

    let currentDailyUsage = 0;
    try {
      currentDailyUsage = (await redis.get<number>(redisDailyKey)) || 0;
    } catch (redisError) {
      logger.warn('[OCR] Error al leer límite diario de Redis (Fail-Safe: abierto)', {
        error: String(redisError),
      });
    }

    const MAX_DAILY_GEMINI = parseInt(process.env.MAX_DAILY_GEMINI || '1000');
    let usarTesseractDirectamente = false;

    if (currentDailyUsage >= MAX_DAILY_GEMINI) {
      logger.warn(
        '[OCR] Cuota diaria de solicitudes Gemini excedida. Cayendo directamente a Tesseract.',
        { usage: currentDailyUsage, limite: MAX_DAILY_GEMINI }
      );
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

    // 3. Validación criptográfica de los Magic Bytes del Base64
    function validateBase64MagicBytes(b64: string, declaredMime: string): boolean {
      try {
        const bytes = Buffer.from(b64.slice(0, 30), 'base64');
        const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
        const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
        const isWebp = bytes[8] === 0x57 && bytes[9] === 0x45; // WEBP signature

        if (declaredMime === 'image/jpeg' && !isJpeg) return false;
        if (declaredMime === 'image/png' && !isPng) return false;
        if (declaredMime === 'image/webp' && !isWebp) return false;
        return true;
      } catch {
        return false;
      }
    }

    if (!validateBase64MagicBytes(imageBase64, mimeType)) {
      logger.security('[OCR] Intento de inyección de archivo malicioso (Magic bytes inválidos)', {
        ip,
        mimeType,
      });
      return NextResponse.json(
        apiError('VALIDATION_ERROR', 'El contenido no corresponde al tipo de imagen declarado.'),
        { status: 400 }
      );
    }

    // 4. Llamar a Google Gemini con Timeout de 50s para evitar Vercel 504 Timeout y dar tiempo a Tesseract
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('OCR_TIMEOUT_50S')), 50000);
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
      const prompt = PROMPT_EXTRACCION_ESTRUCTURADA_STRICT;

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
      if (
        rawRespuesta === 'NO_VALID_DOCUMENT' ||
        rawRespuesta.includes('"error":"NO_VALID_DOCUMENT"') ||
        rawRespuesta === 'PROMPT_INJECTION_DETECTED' ||
        rawRespuesta.includes('"error":"PROMPT_INJECTION_DETECTED"')
      ) {
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
        textoCompleto =
          typeof parsed.textoCompleto === 'string' ? parsed.textoCompleto : rawRespuesta;
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
        logger.warn('[OCR] Error al incrementar límite diario de Gemini en Redis', {
          error: String(redisIncrError),
        });
      }

      // Incrementar el consumo en Firestore para el panel de administración
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        await adminDb.collection('system_metrics').doc(`daily_${todayStr}`).set({
          date: todayStr,
          type: 'daily',
          gemini_requests: admin.firestore.FieldValue.increment(1),
          last_updated: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      } catch (fsError) {
        logger.warn('[OCR] Error guardando uso de Gemini en Firestore', {
          error: String(fsError),
        });
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
        logger.error(
          '[OCR] Error al procesar imagen con Gemini, intentando fallback con Tesseract',
          {
            error: gMsg,
          }
        );
      } else if (gMsg === 'GEMINI_QUOTA_EXCEEDED') {
        logger.warn(
          '[OCR] Cuota diaria de Gemini alcanzada. Cayendo directamente a Tesseract (Fallback)...'
        );
      } else {
        logger.warn(
          '[OCR] Circuit Breaker de Gemini está ABIERTO. Cayendo a Tesseract (Fallback)...'
        );
      }

      // Si el error fue por timeout, no vale la pena intentar Tesseract si Vercel está a punto de matarnos
      // Pero como aumentamos maxDuration a 60s, si el timeout fue de 15s, Tesseract (que toma 10s) sí alcanza a correr.
      if (gMsg.includes('OCR_TIMEOUT_50S')) {
        logger.warn('[OCR] Timeout de 35s alcanzado. Pasando a Tesseract...');
      }

      // --- INICIO BLOQUE LECTOR OCR (PYTHON FALLBACK) ---
      // 🚀 NUEVA ARQUITECTURA: Se eliminó tesseract.js local para ahorrar memoria y tiempo.
      // Ahora se llama a un microservicio externo en Python (Lector-OCR) alojado en Render.
      try {
        const ocrFallbackUrl = process.env.OCR_FALLBACK_URL;
        const ocrEngineSecret = process.env.OCR_ENGINE_SECRET;

        if (!ocrFallbackUrl || !ocrEngineSecret) {
          logger.error('[OCR] CRÍTICO: OCR_FALLBACK_URL o OCR_ENGINE_SECRET no configurados.');
          throw new Error('Fallback OCR no configurado');
        }

        const bodyStr = JSON.stringify({
          imageBase64,
          mimeType,
        });

        const timestamp = Date.now().toString();
        // Generar firma HMAC-SHA256 idéntica a la de la calculadora en Go
        const crypto = await import('crypto');
        const signature = crypto.default
          .createHmac('sha256', ocrEngineSecret)
          .update(timestamp + bodyStr)
          .digest('hex');

        logger.info('[OCR] Llamando al microservicio Lector-OCR (Python)...');
        
        // Competir contra el tiempo restante que nos da Vercel
        const fetchPromise = fetch(ocrFallbackUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Engine-Timestamp': timestamp,
            'X-Engine-Signature': signature,
          },
          body: bodyStr,
        });

        const ocrTimeout = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('PYTHON_OCR_TIMEOUT_55S')), 55000);
        });

        const fallbackResponse = await Promise.race([fetchPromise, ocrTimeout]) as Response;

        if (!fallbackResponse.ok) {
          throw new Error(`El Lector-OCR falló (HTTP ${fallbackResponse.status})`);
        }

        const fallbackData = await fallbackResponse.json();
        
        logger.info('[OCR] Procesamiento con Lector-OCR (Python) exitoso', {
          proveedor: fallbackData.proveedor,
          multasEncontradas: Array.isArray(fallbackData.comparendo) ? fallbackData.comparendo.length : 1
        });

        return NextResponse.json({
          texto: fallbackData.texto,
          palabras: [],
          proveedor: fallbackData.proveedor,
          // Devolvemos el array de comparendos tal cual lo extrajo el motor de Python
          comparendo: fallbackData.comparendo,
        });
      } catch (fallbackError) {
        const fMsg = fallbackError instanceof Error ? fallbackError.message : 'Error desconocido';
        logger.error('[OCR] Error al procesar imagen con Lector-OCR (Fallback fallido)', {
          error: fMsg,
        });

        throw new Error(`Fallback Lector-OCR falló: ${fMsg}. Error original Gemini: ${gMsg}`);
      }
      // --- FIN BLOQUE LECTOR OCR (PYTHON FALLBACK) ---

      // Propagamos el error de Gemini al manejador principal para devolver el 503/500
      throw geminiError;
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
