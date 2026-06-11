import { NextResponse } from 'next/server';
import { ConsultationSchemaBase } from '@/lib/definitions';
import { logger } from '@/lib/logger/security-logger';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';
import { rateLimit } from '@/lib/security/rate-limit';
import { hashPII } from '@/lib/security/server-crypto';
import { apiError } from '@/lib/types/api-response';

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

const EsquemaValidacion = ConsultationSchemaBase.pick({
  cedula: true,
  placa: true,
  cfToken: true,
  ocrData: true,
  websiteHoneypot: true,
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
  // 🛡️ 1. RATE LIMITING (Protección contra Enumeración/Brute-force)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';

  try {
    const { success, reset, isError } = await rateLimit(ip, 10, 60 * 1000, 'validar_consulta_rl');

    if (!success) {
      if (isError) {
        // FAIL-CLOSED: si el motor de rate-limit falla por infraestructura, bloqueamos la
        // petición. Turnstile fue desactivado en esta ruta para evitar 'timeout-or-duplicate',
        // por lo que el rate-limit es la ÚNICA defensa activa contra enumeración de cédulas.
        // Un atacante podría provocar este error deliberadamente para bypassear la protección.
        logger.warn(`[SECURITY] Rate Limit falló por infraestructura — fail-closed para IP: ${ip}`);
        return NextResponse.json(
          apiError('SERVICE_UNAVAILABLE', 'Servicio temporalmente no disponible. Por favor, intenta de nuevo en un momento.'),
          { status: 503 }
        );
      } else {
        logger.warn(`[SECURITY] Rate Limit excedido para IP: ${ip}`);

        const remainingMs = reset;
        const remainingMinutes = Math.floor(remainingMs / 60000);
        const remainingSeconds = Math.ceil((remainingMs % 60000) / 1000);

        let tiempoEspera = '';
        if (remainingMinutes > 0) {
          tiempoEspera = `${remainingMinutes} ${remainingMinutes === 1 ? 'minuto' : 'minutos'}`;
          if (remainingSeconds > 0) {
            tiempoEspera += ` y ${remainingSeconds} ${remainingSeconds === 1 ? 'segundo' : 'segundos'}`;
          }
        } else {
          tiempoEspera = `${remainingSeconds} ${remainingSeconds === 1 ? 'segundo' : 'segundos'}`;
        }

        return NextResponse.json(
          apiError('RATE_LIMITED', `Ha excedido el límite de solicitudes permitidas. Por favor, intente de nuevo en ${tiempoEspera}.`),
          { status: 429, headers: { 'Retry-After': String(Math.ceil(remainingMs / 1000)) } }
        );
      }
    }

    getAdminApp();
    const db = getFirestore();

    const body = await request.json();

    // 1. Validación con Zod (Sanitización y Tipado)
    const resultado = EsquemaValidacion.safeParse(body);
    if (!resultado.success) {
      return NextResponse.json(
        apiError('VALIDATION_ERROR', 'Datos inválidos.', resultado.error.flatten()),
        { status: 400 }
      );
    }

    // 🛡️ [Honeypot] Detección silenciosa de bots
    if (resultado.data.websiteHoneypot && resultado.data.websiteHoneypot.length > 0) {
      logger.security('[validar-consulta] Honeypot activado — bot detectado', { ip });
      return NextResponse.json({
        success: true,
        valido: true,
        mensaje: 'Validación preliminar exitosa. Analizando viabilidad...',
        datos: {
          placa: (resultado.data.placa || 'N/A').toUpperCase(),
        },
      });
    }

    const { cedula, placa, ocrData } = resultado.data;
    const cedulaOfuscada = ofuscarPII(cedula);

    if (ocrData && ocrData.confidenceScore !== undefined && ocrData.confidenceScore < 50) {
      logger.warn(`[OCR] Baja confianza detectada en pre-validación para ${placa || 'N/A'}`);
    }

    logger.info(`[VALIDATION] Validando viabilidad para cédula: ${cedulaOfuscada}`);

    // 🛑 1. VERIFICACIÓN CLOUDFLARE TURNSTILE (Guardián Anti-Bot)
    // Deprecado en validar-consulta (Edge) en v2.1.9 para permitir que el token sea verificado
    // exclusivamente en create-consultation (Node), evitando el error 'timeout-or-duplicate'.
    // -----------------------------------------------------------------------------------

    // ✅ FIN VERIFICACIÓN CLOUDFLARE

    // ⚡ 2. Hash HMAC-SHA256 — MANDATO CRÍTICO: debe ser idéntico al usado en create-consultation.
    // Se usa hashPII() (HMAC-SHA256 con PII_HMAC_SECRET) para garantizar que el hash resultante
    // coincida con el índice escrito por create-consultation en 'consultas_index'.
    // NUNCA usar crypto.subtle.digest('SHA-256') aquí — produce un hash diferente e incompatible.
    const hashHex = hashPII(cedula);

    // ⚡ Consulta O(1) al índice vía Admin SDK (sin API key en URL, sin red extra)
    // MANDATO-FILTRO: No se usan variables NEXT_PUBLIC en URLs de servidor.
    const docSnap = await db.collection('consultas_index').doc(hashHex).get();

    // 3. Evaluar lógica de negocio
    if (docSnap.exists) {
      // El documento existe → consulta activa preexistente
      logger.warn('[VALIDATION] Consulta activa preexistente bloqueada', { cedulaOfuscada });
      return NextResponse.json({
        success: true,
        valido: false,
        mensaje: 'Ya existe una consulta activa para este documento.',
      });
    }

    logger.info('[VALIDATION] Validación preliminar exitosa', { placa, cedulaOfuscada });

    return NextResponse.json({
      success: true,
      valido: true,
      mensaje: 'Validación preliminar exitosa. Analizando viabilidad...',
      datos: {
        placa: placa?.toUpperCase() || 'N/A',
      },
    });
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : 'Error desconocido';
    logger.error('[VALIDATION Error] Fallo en la validación:', { error: mensaje });

    return NextResponse.json(
      apiError('INTERNAL_ERROR', 'Hubo un inconveniente al validar tus datos. Por favor, intenta de nuevo en un momento.'),
      { status: 500 }
    );
  }
}
