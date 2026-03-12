import { NextResponse } from 'next/server';
import { ConsultationSchema } from '@/lib/definitions';
import { logger } from '@/lib/logger/security-logger';

/**
 * Motor de Validación — Desmulta v1.9.2
 *
 * MANDATO-FILTRO:
 * 1. Validación estricta con Zod.
 * 2. Logging seguro con ofuscación PII.
 * 3. Ejecución estable sobre Node.js Runtime.
 */

// 🚀 1. Normalización a Node.js Runtime para estabilidad v2.3.0
export const runtime = 'nodejs';

const EsquemaValidacion = ConsultationSchema.pick({
  cedula: true,
  placa: true,
  turnstileToken: true,
});

/**
 * Ofusca un identificador personal para los logs,
 * mostrando solo los últimos 4 caracteres precedidos de asteriscos.
 */
function ofuscarPII(valor: string): string {
  if (!valor || valor.length <= 4) return '****';
  return `****${valor.slice(-4)}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Validación con Zod (Sanitización y Tipado)
    const resultado = EsquemaValidacion.safeParse(body);
    if (!resultado.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', detalles: resultado.error.flatten() },
        { status: 400 }
      );
    }

    const { cedula, placa } = resultado.data;
    const cedulaOfuscada = ofuscarPII(cedula);

    logger.info(`[VALIDATION] Validando viabilidad para cédula: ${cedulaOfuscada}`);

    // 🛑 1. VERIFICACIÓN CLOUDFLARE TURNSTILE (Guardián Anti-Bot)
    // Deprecado en validar-consulta (Edge) en v2.1.9 para permitir que el token sea verificado
    // exclusivamente en create-consultation (Node), evitando el error 'timeout-or-duplicate'.
    // -----------------------------------------------------------------------------------

    // ✅ FIN VERIFICACIÓN CLOUDFLARE

    // ⚡ 2. Hash O(1) vía Web Crypto API
    const encoder = new TextEncoder();
    const dataBuf = encoder.encode(cedula);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuf);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

    // Petición directa GET O(1) al documento índice protegido (Cero exposición de PII)
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/consultas_index/${hashHex}?key=${apiKey}`;

    const response = await fetch(firestoreUrl, {
      method: 'GET',
    });

    // 3. Evaluar lógica de negocio
    if (response.ok) {
      // 200 OK significa que el documento existe
      logger.warn('[VALIDATION] Consulta activa preexistente bloqueada', { cedulaOfuscada });
      return NextResponse.json({
        success: true,
        valido: false,
        mensaje: 'Ya existe una consulta activa para este documento.',
      });
    }

    if (response.status !== 404) {
      throw new Error(`Error en Firestore REST API GET: ${response.status} ${response.statusText}`);
    }

    logger.info('[VALIDATION] Validación preliminar exitosa', { placa, cedulaOfuscada });

    return NextResponse.json({
      success: true,
      valido: true,
      mensaje: 'Validación preliminar exitosa. Analizando viabilidad...',
      datos: {
        placa: placa?.toUpperCase() || 'N/A',
        cedula,
      },
    });
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : 'Error desconocido';
    logger.error('[VALIDATION Error] Fallo en la validación:', { error: mensaje });

    return NextResponse.json(
      {
        error:
          'Hubo un inconveniente al validar tus datos. Por favor, intenta de nuevo en un momento.',
      },
      { status: 500 }
    );
  }
}
