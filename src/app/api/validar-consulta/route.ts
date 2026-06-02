import { NextResponse } from 'next/server';
import { ConsultationSchemaBase } from '@/lib/definitions';
import { logger } from '@/lib/logger/security-logger';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';
import { rateLimit } from '@/lib/security/rate-limit';

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
        // FAIL-OPEN: si el rate-limiter falla por infraestructura (cold start de Firestore,
        // credenciales no disponibles, etc.), permitimos la petición en lugar de retornar 500.
        // Las otras capas de seguridad (Turnstile, Zod, verificación de duplicados) siguen activas.
        logger.warn(`[SECURITY] Rate Limit falló por infraestructura — fail-open para IP: ${ip}`);
        // Continuamos con la ejecución normal (no retornamos aquí)
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
          {
            error: `Ha excedido el límite de solicitudes permitidas. Por favor, intente de nuevo en ${tiempoEspera}.`,
          },
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
        { error: 'Datos inválidos', detalles: resultado.error.flatten() },
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

    // ⚡ 2. Hash O(1) vía Web Crypto API
    const encoder = new TextEncoder();
    const dataBuf = encoder.encode(cedula);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuf);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    // ⚡ 2. Consulta O(1) al índice vía Admin SDK (sin API key en URL, sin red extra)
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
      {
        error:
          'Hubo un inconveniente al validar tus datos. Por favor, intenta de nuevo en un momento.',
      },
      { status: 500 }
    );
  }
}
