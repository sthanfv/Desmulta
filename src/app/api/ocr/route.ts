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

    // 4. Llamar a Google Gemini
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

      const result = await model.generateContent([prompt, ...imageParts]);
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
      logger.error('[OCR] Error al procesar imagen con Gemini, intentando fallback con Tesseract', {
        error: geminiError instanceof Error ? geminiError.message : 'Error desconocido',
      });

      try {
        // Configurar Tesseract.js en el entorno Node.js
        const worker = await createWorker('spa');
        const dataUri = `data:${mimeType};base64,${imageBase64}`;
        const {
          data: { text },
        } = await worker.recognize(dataUri);
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
        logger.error('[OCR] Error al procesar imagen con Tesseract (Fallback fallido)', {
          error: tesseractError instanceof Error ? tesseractError.message : 'Error desconocido',
        });

        return NextResponse.json(
          { error: 'Error al procesar la imagen con IA y OCR local falló. Intenta de nuevo.' },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    logger.error('[OCR] Error general', { error });
    return NextResponse.json({ error: 'Error interno en servidor' }, { status: 500 });
  }
}
