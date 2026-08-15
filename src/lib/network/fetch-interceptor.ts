import { headers } from 'next/headers';
import { logger } from '@/lib/logger/security-logger';

export interface InterceptedFetchOptions extends RequestInit {
  microserviceName: string; // Ej: 'Go (Calculadora)', 'Python (OCR)', 'Gemini API'
  originalPayload?: unknown; // Para reportar qué datos causaron el fallo
}

/**
 * Wrapper sobre `fetch` que inyecta automáticamente el `X-Trace-Id`
 * (capturado vía next/headers) y maneja las fallas enviando una alerta estandarizada a Telegram.
 */
export async function fetchWithTrace(
  url: string | URL | Request,
  options: InterceptedFetchOptions
): Promise<Response> {
  let traceId = 'unknown-trace-id';
  let host = 'unknown-host';
  let userAgent = 'unknown-user-agent';

  try {
    const headersList = await headers();
    traceId =
      headersList.get('x-trace-id') || headersList.get('x-vercel-id') || crypto.randomUUID();
    host = headersList.get('host') || 'desmulta.online';
    userAgent = headersList.get('user-agent') || 'Unknown';
  } catch (_e) {
    // Silencioso: Si falla (ej. en un contexto donde headers() no está disponible) seguimos adelante
  }

  // Inyectar el X-Trace-Id en las cabeceras salientes
  const outgoingHeaders = new Headers(options.headers || {});
  outgoingHeaders.set('X-Trace-Id', traceId);

  const fetchOptions: RequestInit = {
    ...options,
    headers: outgoingHeaders,
  };

  try {
    const response = await fetch(url, fetchOptions);

    // Si la respuesta no es OK, atrapamos el JSON estructurado del microservicio
    if (!response.ok) {
      let errorDetails = '';
      try {
        const errorJson = await response.json();
        errorDetails = JSON.stringify(errorJson, null, 2);
      } catch (_jsonErr) {
        errorDetails = await response.text();
      }

      // Preparar el contexto estilo Vercel para Telegram
      const alertContext = {
        traceId,
        host,
        userAgent,
        microservice: options.microserviceName,
        endpoint: url.toString(),
        error: errorDetails,
        payload: options.originalPayload || 'N/A',
      };

      // Disparar la alerta estructurada
      logger.error(
        `[${options.microserviceName}] CRITICO: Falla en solicitud de red`,
        alertContext
      );
    }

    return response;
  } catch (error: unknown) {
    // Si hay un error de red (Timeout, DNS, etc.)
    const alertContext = {
      traceId,
      host,
      userAgent,
      microservice: options.microserviceName,
      endpoint: url.toString(),
      error: error instanceof Error ? error.message : String(error),
      payload: options.originalPayload || 'N/A',
    };

    logger.error(
      `[${options.microserviceName}] CRITICO: Falla total de red (Timeout/DNS)`,
      alertContext
    );
    throw error;
  }
}
