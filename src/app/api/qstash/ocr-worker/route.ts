import { NextRequest, NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger/security-logger';
import { extraerComparendo, construirAnalisisCompleto } from '@/lib/legal/comparendo-extractor';

const redis = Redis.fromEnv();

// Verificador de firmas de QStash
const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || '',
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || '',
});

export const maxDuration = 60; // 60 segundos permitidos en background

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
    
    if (process.env.QSTASH_CURRENT_SIGNING_KEY) {
      const isValid = await receiver.verify({
        signature: signature || '',
        body: bodyText,
      });
      if (!isValid) {
        return NextResponse.json({ error: 'Firma QStash inválida' }, { status: 401 });
      }
    }

    const payload = JSON.parse(bodyText);
    const { imageBase64, mimeType, webhookUrl, plan } = payload;

    if (!imageBase64 || !mimeType) {
      throw new Error('Faltan campos requeridos en el payload');
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

    if (rawRespuesta === 'NO_VALID_DOCUMENT' || rawRespuesta.includes('"error":"NO_VALID_DOCUMENT"')) {
      finalPayload = {
        success: false,
        error: 'INVALID_DOCUMENT',
        message: 'La imagen no parece ser una multa o resolución de tránsito válida.'
      };
    } else {
      let parsedJSON: Record<string, unknown> | null = null;
      let textoCompleto = rawRespuesta;

      try {
        const jsonLimpio = rawRespuesta
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();
        parsedJSON = JSON.parse(jsonLimpio) as Record<string, unknown>;
        textoCompleto = typeof parsedJSON.textoCompleto === 'string' ? parsedJSON.textoCompleto : rawRespuesta;
      } catch {
        logger.warn('[ocr-worker] Gemini devolvió texto crudo (modo legacy)');
      }

      const comparendo = extraerComparendo(parsedJSON);
      const analisis = construirAnalisisCompleto(
        textoCompleto,
        comparendo,
        'google-gemini-2.5-flash',
        parsedJSON !== null ? 95 : 60
      );

      finalPayload = {
        success: true,
        ...analisis,
        _meta: { plan }
      };
    }

    // 4. Enviar resultado al webhook del cliente B2B si lo proporcionó
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalPayload)
        });
        logger.info('[ocr-worker] Resultado enviado al webhook exitosamente', { webhookUrl });
      } catch (webhookErr) {
        const msg = webhookErr instanceof Error ? webhookErr.message : String(webhookErr);
        logger.error('[ocr-worker] Fallo al entregar webhook al cliente', { webhookUrl, error: msg });
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('[ocr-worker] Error fatal en worker', { error: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
