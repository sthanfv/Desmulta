import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { getSecureIp } from '@/lib/security/ip-utils';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { logger } from '@/lib/logger/security-logger';
import { trackDemandQuery } from '@/lib/analytics/demand-tracker';
import { sendTelegramAgentAlert } from '@/lib/telegram';

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
    // 1. Rate Limiting dedicado por IP (15 consultas cada 10 min)
    const ip = getSecureIp(req);
    const rl = await checkRateLimit('chatAgent', ip);
    if (!rl.success) {
      return NextResponse.json(
        {
          error: 'Límite temporal alcanzado',
          reply:
            'Debido a la alta demanda de consultas ciudadanas en vivo, hemos pausado temporalmente tus preguntas para garantizar la velocidad de respuesta a todos los usuarios. Puedes continuar en unos minutos o radicar tu caso ahora con un especialista para estudio prioritario.',
          isRateLimited: true,
          citations: [],
          suggested_action: {
            tipo: 'modal_full',
            titulo: 'Radicar Caso para Estudio Gratuito',
            url: '#consultar',
            descripcion:
              'Un especialista evaluará tu comparendo y la cadena de notificación del RUNT.',
          },
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

    // 3. Inyección Algorítmica de Contexto y Ventas (Guardrail)
    const isSolutionIntent =
      /(c[oó]mo|qu[eé] hago|ayuda|impugnar|pagar|solucionar|reclamar|defender|eliminar|borrar|prescripci[oó]n|embargo)/i.test(
        message
      );

    const contextDirective = isSolutionIntent
      ? `Responde de forma pedagógica y empática citando la ley aplicable (ej. C-038 de 2020, Ley 1843). SIN EMBARGO, NO des la solución directa de 'hazlo tú mismo'. Concluye persuadiendo al usuario que la forma más segura de resolverlo es adquiriendo las plantillas de Desmulta o contratando la asesoría de nuestros expertos.`
      : `Sé pedagógico, claro y empático. Explica el concepto legal de forma sencilla sin ser insistente con ventas.`;

    // 4. Preparación de la petición B2B al microservicio Python
    const agentUrl = process.env.AGENT_AI_URL || 'http://127.0.0.1:8080';
    const hmacSecret =
      process.env.AGENT_HMAC_SECRET ||
      '294b5b30f188fa0f5143b882744439c65680d5936a3be43889f83c7db63bd6db';

    const timestamp = Date.now().toString();
    // FIX CRÍTICO (Prompt Injection): Nunca concatenar. Aislar plano de control en "system_directive"
    const payload = JSON.stringify({
      message: message,
      system_directive: contextDirective,
      city,
      history,
    });

    // 4.1. Registro Asíncrono de Analítica de Demanda (Fire-and-forget, 0% latencia al usuario)
    trackDemandQuery(message).catch((err) => logger.error('Error tracking demand', err));

    // 5. Firma Criptográfica HMAC-SHA256
    const signature = crypto
      .createHmac('sha256', hmacSecret)
      .update(timestamp)
      .update(payload)
      .digest('hex');

    const traceId = `web-chat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // 6. Invocación al Microservicio de IA
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

        // Alerta al equipo DevSecOps/SRE
        sendTelegramAgentAlert(`Fallo de Motor IA (HTTP ${response.status})`, traceId).catch(
          () => null
        );

        return NextResponse.json(
          {
            reply:
              'En este momento nuestro motor técnico está procesando consultas ciudadanas de alta demanda. Recuerda que bajo la Ley 1843 de 2017 y la Sentencia C-038 de 2020, las fotomultas exigen prueba plena del conductor y notificación formal al RUNT.',
            citations: [
              {
                norma: 'Ley 1843 de 2017',
                articulo: 'Art. 8 - Procedimiento de Notificación',
                resumen: 'La notificación debe realizarse por correo certificado al RUNT.',
              },
            ],
            suggested_action: {
              tipo: 'camaras',
              titulo: 'Verificar Radares Autorizados ANSV',
              url: '/multas/bogota/camaras',
              descripcion: 'Consulta si las cámaras de tu ciudad tienen permisos vigentes.',
            },
            follow_up_questions: [
              '¿A los cuántos años prescribe un comparendo?',
              '¿Qué hacer si me embargaron la cuenta bancaria?',
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

      // Alerta al equipo DevSecOps/SRE
      sendTelegramAgentAlert(`Microservicio IA Down (Timeout/Network)`, traceId).catch(() => null);

      return NextResponse.json(
        {
          reply:
            'Bajo la Ley 1843 de 2017 y la Sentencia C-038 de 2020, la Secretaría de Tránsito no puede sancionar al propietario sin identificar al conductor infractor, y debe agotar la notificación física en la dirección registrada en el RUNT.',
          citations: [
            {
              norma: 'Ley 1843 de 2017',
              articulo: 'Art. 8 - Procedimiento de Notificación',
              resumen: 'Obligatoriedad de envío por mensajería certificada.',
            },
            {
              norma: 'Sentencia C-038 de 2020',
              articulo: 'Corte Constitucional',
              resumen: 'Prohibición de responsabilidad solidaria automática.',
            },
          ],
          suggested_action: {
            tipo: 'modal_simit',
            titulo: 'Subir Captura para Estudio Técnico',
            url: '#subir-captura',
            descripcion: 'Evaluamos la validez de tu comparendo de forma inmediata.',
          },
          follow_up_questions: [
            '¿Cómo saber si la dirección del RUNT fue respetada?',
            '¿Qué trámite procede ante un embargo de cuenta?',
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
