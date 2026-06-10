import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createWorker } from 'tesseract.js';
import { rateLimit } from '@/lib/security/rate-limit';
import { logger } from '@/lib/logger/security-logger';

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

function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('[OCR] Credenciales de Gemini no configuradas (GEMINI_API_KEY)');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Usar flash-2.5 por ser el más rápido y óptimo para OCR multimodal en 2026
  return genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
}

const MAX_BYTES = 4 * 1024 * 1024; // 4MB

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limit por IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = await rateLimit(`ocr:${ip}`, 3, 10 * 60 * 1000, 'ocrRateLimits');
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Espera 10 minutos.' },
        { status: 429 }
      );
    }

    // 2. Leer el body
    const body = await request.json();
    const { imageBase64, mimeType } = body as {
      imageBase64: string;
      mimeType: string;
    };

    // 3. Validaciones básicas
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json({ error: 'Imagen requerida en base64' }, { status: 400 });
    }

    const mimePermitidos = ['image/jpeg', 'image/png', 'image/webp'];
    if (!mimePermitidos.includes(mimeType)) {
      return NextResponse.json(
        { error: `Tipo de imagen no permitido: ${mimeType}` },
        { status: 400 }
      );
    }

    // Verificar tamaño (base64 ~= 4/3 del binario)
    const estimatedBytes = Math.ceil(imageBase64.length * 0.75);
    if (estimatedBytes > MAX_BYTES) {
      return NextResponse.json({ error: 'La imagen excede el límite de 4MB' }, { status: 400 });
    }

    // 4. Llamar a Google Gemini con Timeout de 25s para evitar Vercel 504 Timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('OCR_TIMEOUT_25S')), 25000);
    });

    try {
      const model = getGeminiModel();
      const prompt = `First, check if this image appears to be a traffic ticket or legal document by looking for words like: "COMPARENDO", "INFRACCION", "SIMIT", "REPUBLICA DE COLOMBIA", "SECRETARIA", "TRANSITO", "RESOLUCION", or "MULTA". 
If you do not find any of these words, immediately stop and return EXACTLY the string "NO_VALID_DOCUMENT". 
If it is a valid document, extract all text from this image exactly as it appears. Do not add any conversational text, markdown, or explanations. Just return the raw text visible.`;

      const imageParts = [
        {
          inlineData: {
            data: imageBase64,
            mimeType,
          },
        },
      ];

      // Compite Gemini contra el reloj de 25 segundos
      const result = (await Promise.race([
        model.generateContent([prompt, ...imageParts]),
        timeoutPromise,
      ])) as any;

      const response = await result.response;
      const textoCompleto = response.text();

      if (textoCompleto.trim() === 'NO_VALID_DOCUMENT') {
        logger.warn('[OCR] Imagen rechazada: no parece un documento de tránsito válido', { ip });
        return NextResponse.json(
          {
            error:
              'La imagen no parece ser una multa o resolución válida. Intenta con otra foto más clara.',
          },
          { status: 422 }
        );
      }

      if (!textoCompleto) {
        logger.warn('[OCR] Gemini no detectó texto en la imagen', { ip });
        return NextResponse.json({ texto: '', palabras: [] });
      }

      logger.info('[OCR] Procesamiento con Gemini exitoso', {
        caracteres: textoCompleto.length,
      });

      return NextResponse.json({
        texto: textoCompleto,
        palabras: [], // Gemini no devuelve bounding boxes fácilmente, retornamos vacío para no romper la app
        proveedor: 'google-gemini-2.5-flash',
      });
    } catch (geminiError) {
      const gMsg = geminiError instanceof Error ? geminiError.message : 'Error desconocido';
      logger.error('[OCR] Error al procesar imagen con Gemini, intentando fallback con Tesseract', {
        error: gMsg,
      });

      // Si el error fue por timeout de Vercel, no vale la pena intentar Tesseract (es muy lento)
      if (gMsg.includes('OCR_TIMEOUT_25S')) {
        throw new Error('Timeout de 25s alcanzado. Gemini tardó demasiado (Alta Demanda 503).');
      }

      try {
        // Configurar Tesseract.js en el entorno Node.js
        const worker = await createWorker('spa');

        // Competir Tesseract contra el reloj restante (10s aprox si Gemini falló rápido)
        const tesseractTimeout = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('TESSERACT_TIMEOUT_10S')), 10000);
        });

        const dataUri = `data:${mimeType};base64,${imageBase64}`;

        const recognizeResult = (await Promise.race([
          worker.recognize(dataUri),
          tesseractTimeout,
        ])) as any;

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
    return NextResponse.json(
      {
        error:
          'Nuestros servidores de IA están temporalmente saturados por alta demanda. Por favor, intenta de nuevo en unos minutos.',
      },
      { status: statusCode }
    );
  }
}
