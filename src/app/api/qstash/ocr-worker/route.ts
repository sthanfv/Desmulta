import { NextRequest, NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger/security-logger';
import { extraerComparendos, construirAnalisisCompleto } from '@/lib/legal/comparendo-extractor';
import { validateWebhookUrl } from '@/lib/security/ssrf-guard';
import { PROMPT_EXTRACCION_ESTRUCTURADA_ARRAY } from '@/lib/ai/gemini-prompts';

const redis = Redis.fromEnv();

// Verificador de firmas de QStash
const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || '',
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || '',
});

export const maxDuration = 60; // 60 segundos permitidos en background

const PROMPT_EXTRACCION_ESTRUCTURADA = PROMPT_EXTRACCION_ESTRUCTURADA_ARRAY;

function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('[ocr-worker] GEMINI_API_KEY no configurada.');
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
}

export async function POST(request: NextRequest) {
  // 1. Validar la firma de QStash para evitar ejecuciones maliciosas
  try {
    const signature = request.headers.get('upstash-signature');
    const bodyText = await request.text();

    const signingKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
    if (!signingKey || signingKey.trim() === '') {
      logger.error('[ocr-worker] QSTASH_CURRENT_SIGNING_KEY no configurada en el entorno');
      return NextResponse.json({ error: 'Configuración de firma incompleta' }, { status: 503 });
    }

    if (!signature || signature.trim() === '') {
      logger.warn('[ocr-worker] Intento de acceso sin firma QStash');
      return NextResponse.json({ error: 'Firma QStash requerida' }, { status: 401 });
    }

    const isValid = await receiver.verify({
      signature,
      body: bodyText,
    });
    if (!isValid) {
      return NextResponse.json({ error: 'Firma QStash inválida' }, { status: 401 });
    }

    const payload = JSON.parse(bodyText);
    const { imageBase64, mimeType, webhookUrl, plan } = payload;

    if (!imageBase64 || !mimeType) {
      throw new Error('Faltan campos requeridos en el payload');
    }

    function validateBase64MagicBytes(b64: string, declaredMime: string): boolean {
      try {
        const bytes = Buffer.from(b64.slice(0, 30), 'base64');
        const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
        const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
        const isWebp = bytes[8] === 0x57 && bytes[9] === 0x45;

        if (declaredMime === 'image/jpeg' && !isJpeg) return false;
        if (declaredMime === 'image/png' && !isPng) return false;
        if (declaredMime === 'image/webp' && !isWebp) return false;
        return true;
      } catch {
        return false;
      }
    }

    if (!validateBase64MagicBytes(imageBase64, mimeType)) {
      logger.security(
        '[ocr-worker] Intento de inyección de archivo malicioso (Magic bytes inválidos)',
        {
          mimeType,
        }
      );
      return NextResponse.json(
        { error: 'El contenido no corresponde al tipo de imagen declarado' },
        { status: 400 }
      );
    }

    // 2. Control de cuota diaria global de Gemini
    const dateStr = new Date().toISOString().split('T')[0];
    const dailyCount = await redis.incr(`gemini:daily:${dateStr}`);
    if (dailyCount === 1) await redis.expire(`gemini:daily:${dateStr}`, 86400);

    if (dailyCount > 500) {
      throw new Error('CUOTA DIARIA DE GEMINI EXCEDIDA');
    }

    // 3. Ejecutar OCR con Gemini (sin timeout estricto porque estamos en background queue)
    const model = getGeminiModel();
    const result = await model.generateContent([
      PROMPT_EXTRACCION_ESTRUCTURADA,
      { inlineData: { data: imageBase64, mimeType } },
    ]);

    const rawRespuesta = result.response.text().trim();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let finalPayload: any = {};

    if (
      rawRespuesta === 'NO_VALID_DOCUMENT' ||
      rawRespuesta.includes('"error":"NO_VALID_DOCUMENT"')
    ) {
      finalPayload = {
        success: false,
        error: 'INVALID_DOCUMENT',
        message: 'La imagen no parece ser una multa o resolución de tránsito válida.',
      };
    } else {
      let parsedJSON: unknown = null;
      let textoCompleto = rawRespuesta;

      try {
        const jsonLimpio = rawRespuesta
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();
        parsedJSON = JSON.parse(jsonLimpio);

        // Texto completo fallback
        if (
          Array.isArray(parsedJSON) &&
          parsedJSON.length > 0 &&
          typeof parsedJSON[0].textoCompleto === 'string'
        ) {
          textoCompleto = parsedJSON[0].textoCompleto;
        } else if (
          !Array.isArray(parsedJSON) &&
          parsedJSON !== null &&
          typeof (parsedJSON as Record<string, unknown>).textoCompleto === 'string'
        ) {
          textoCompleto = (parsedJSON as Record<string, unknown>).textoCompleto as string;
        }
      } catch {
        logger.warn('[ocr-worker] Gemini devolvió texto crudo (modo legacy)');
      }

      const comparendos = extraerComparendos(parsedJSON);

      if (comparendos.length === 0) {
        // Fallback si no extrajo nada pero era texto válido
        const analisis = construirAnalisisCompleto(
          textoCompleto,
          null,
          'google-gemini-2.5-flash',
          parsedJSON !== null ? 95 : 60
        );
        finalPayload = {
          success: true,
          resultados: [analisis],
          _meta: { plan },
        };
      } else {
        const resultados = comparendos.map((comp) =>
          construirAnalisisCompleto(textoCompleto, comp, 'google-gemini-2.5-flash', 95)
        );
        finalPayload = {
          success: true,
          resultados,
          _meta: { plan },
        };
      }
    }

    if (webhookUrl) {
      try {
        validateWebhookUrl(webhookUrl);

        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalPayload),
        });
        logger.info('[ocr-worker] Resultado enviado al webhook exitosamente', { webhookUrl });
      } catch (webhookErr) {
        const msg = webhookErr instanceof Error ? webhookErr.message : String(webhookErr);
        logger.error('[ocr-worker] Fallo al entregar webhook al cliente o validación fallida', {
          webhookUrl,
          error: msg,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('[ocr-worker] Error fatal en worker', { error: msg });
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
