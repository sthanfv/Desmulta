import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { getSecureIp } from '@/lib/security/ip-utils';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { logger } from '@/lib/logger/security-logger';

// Esquema de validación del payload entrante
const chatRequestSchema = z.object({
  message: z
    .string()
    .min(1, 'El mensaje no puede estar vacío')
    .max(1000, 'Mensaje demasiado largo'),
  city: z.string().max(100).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(2000),
      })
    )
    .max(20)
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting por IP para mitigar abusos
    const ip = getSecureIp(req);
    const rl = await checkRateLimit('consultation', ip);
    if (!rl.success) {
      return NextResponse.json(
        {
          error: 'Demasiadas consultas al asistente. Por favor, espera unos segundos.',
          reply:
            'Has alcanzado el límite temporal de mensajes. Por favor espera unos momentos antes de continuar.',
          citations: [],
          follow_up_questions: [],
        },
        { status: 429 }
      );
    }

    // 2. Validación de Entrada
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Payload JSON inválido' }, { status: 400 });
    }

    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parámetros inválidos', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { message, city, history } = parsed.data;

    // 3. Preparación de la petición B2B al microservicio Python
    const agentUrl = process.env.AGENT_AI_URL || 'http://127.0.0.1:8080';
    const hmacSecret =
      process.env.AGENT_HMAC_SECRET ||
      '294b5b30f188fa0f5143b882744439c65680d5936a3be43889f83c7db63bd6db';

    const timestamp = Date.now().toString();
    const payload = JSON.stringify({ message, city, history });

    // 4. Firma Criptográfica HMAC-SHA256
    const signature = crypto
      .createHmac('sha256', hmacSecret)
      .update(timestamp)
      .update(payload)
      .digest('hex');

    const traceId = `web-chat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // 5. Invocación al Microservicio de IA
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000); // 12s timeout

    try {
      const response = await fetch(`${agentUrl}/api/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Engine-Timestamp': timestamp,
          'X-Engine-Signature': signature,
          'X-Trace-Id': traceId,
        },
        body: payload,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error(`[Chat-API] Fallo del microservicio IA (${response.status}):`, errorData);

        return NextResponse.json(
          {
            reply:
              'En este momento nuestro motor jurídico está procesando un alto volumen de consultas. En Colombia, recuerda que según el Art. 159 de la Ley 769 de 2002 y la Sentencia C-038 de 2020, tienes derecho al debido proceso y a auditar la legalidad de tu fotomulta.',
            citations: [],
            suggested_action: {
              tipo: 'camaras',
              titulo: 'Verificar Cámaras de Fotomulta',
              url: '/multas/bogota/camaras',
              descripcion: 'Consulta los radares autorizados en tu ciudad.',
            },
            follow_up_questions: [
              '¿Cuándo prescribe una fotomulta?',
              '¿Cómo verificar si una cámara está autorizada?',
            ],
            trace_id: traceId,
          },
          { status: 200 }
        );
      }

      const data = await response.json();
      return NextResponse.json(data, { status: 200 });
    } catch (fetchError: unknown) {
      clearTimeout(timeout);
      logger.error('[Chat-API] Microservicio no disponible:', fetchError);

      // Fallback local elegante para que el usuario nunca vea la app rota
      return NextResponse.json(
        {
          reply:
            '¡Hola! En Desmulta te ayudamos a defenderte de fotomultas y comparendos de tránsito. Recuerda que bajo la Ley 1843 de 2017 y la Sentencia C-038 de 2020, la Secretaría de Tránsito debe demostrar quién era el conductor infractor y notificar a la dirección del RUNT.',
          citations: [
            {
              norma: 'Ley 1843 de 2017',
              articulo: 'Art. 8 - Procedimiento de Notificación',
              resumen: 'La notificación debe realizarse por correo certificado al RUNT.',
            },
            {
              norma: 'Sentencia C-038 de 2020',
              articulo: 'Corte Constitucional',
              resumen: 'Prohibición de responsabilidad solidaria automática.',
            },
          ],
          suggested_action: {
            tipo: 'calculadora',
            titulo: 'Calcular Prescripción de Comparendo',
            url: '/#escaner',
            descripcion: 'Calcula gratis si tu multa ya caducó o prescribió.',
          },
          follow_up_questions: [
            '¿Qué requisitos debe tener una fotomulta legal?',
            '¿Cuándo prescribe una multa con cobro coactivo?',
          ],
          trace_id: traceId,
        },
        { status: 200 }
      );
    }
  } catch (error: unknown) {
    logger.error('[Chat-API] Error interno inesperado:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al procesar la conversación' },
      { status: 500 }
    );
  }
}
