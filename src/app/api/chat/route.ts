import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { getSecureIp } from '@/lib/security/ip-utils';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { logger } from '@/lib/logger/security-logger';
import { trackDemandQuery } from '@/lib/analytics/demand-tracker';
import { alertServiceFailureInBackground } from '@/lib/monitoring/service-alert';
import { detectSmallTalk, smallTalkReply, STARTER_QUESTIONS } from '@/lib/chat/small-talk';
import { buildWhatsAppUrl } from '@/lib/chat/whatsapp';
import { trimHistory } from '@/lib/chat/history';

// Debe superar el timeout de Gemini dentro del agente (10 s): así, si Gemini se demora, el
// agente alcanza a responder con su motor de respaldo en vez de que la web corte primero.
const AGENT_TIMEOUT_MS = 14_000;

// Por debajo del límite del agente (32 KB); configurable si el agente cambia su límite.
const AGENT_PAYLOAD_BUDGET_BYTES = Number(process.env.AGENT_MAX_PAYLOAD_BYTES) || 28_000;

const chatRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'El mensaje no puede estar vacío')
    .max(1000, 'Mensaje demasiado largo'),
  city: z.string().max(100).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(4000),
      })
    )
    .max(30)
    .optional(),
});

interface SuggestedAction {
  tipo: string;
  titulo: string;
  url: string;
  descripcion: string;
}

const SOLUTION_INTENT =
  /(c[oó]mo|qu[eé] hago|ayuda|impugnar|pagar|solucionar|reclamar|defender|eliminar|borrar|prescripci[oó]n|embargo)/i;

const DIRECTIVE_SOLUTION = `Con tono cálido y en pocas líneas, responde de forma pedagógica y empática citando la ley aplicable solo si aporta (ej. C-038 de 2020, Ley 1843). SIN EMBARGO, NO des la solución directa de 'hazlo tú mismo'. Concluye persuadiendo al usuario que la forma más segura de resolverlo es adquiriendo las plantillas de Desmulta o contratando la asesoría de nuestros expertos.`;
const DIRECTIVE_CONVERSATION = `Conversa de forma cálida y natural, como una persona que sabe del tema. Responde exactamente lo que pregunta en pocas líneas, sin ser insistente con ventas.`;

function whatsappAction(): SuggestedAction {
  return {
    tipo: 'whatsapp',
    titulo: 'Hablar con una persona',
    url: buildWhatsAppUrl(),
    descripcion: 'Nuestro equipo te responde por WhatsApp.',
  };
}

/** Respuesta local cuando el agente no está disponible: humana, honesta y sin leyes de relleno. */
function localReply(message: string, traceId?: string) {
  const kind = detectSmallTalk(message);
  if (kind) {
    return {
      reply: smallTalkReply(kind),
      citations: [],
      suggested_action: null,
      follow_up_questions: kind === 'farewell' ? [] : STARTER_QUESTIONS,
      trace_id: traceId,
    };
  }
  return {
    reply:
      'Uy, en este momento no logro conectarme con mi sistema para responderte bien 😕. Intenta de nuevo en un minuto o, si prefieres, escríbenos por WhatsApp y una persona del equipo te ayuda con tu caso.',
    citations: [],
    suggested_action: whatsappAction(),
    follow_up_questions: [],
    degraded: true,
    trace_id: traceId,
  };
}

function rateLimitedReply(kind: 'burst' | 'daily') {
  return {
    error: 'Límite temporal alcanzado',
    reply:
      kind === 'burst'
        ? '¡Vas muy rápido! 😅 Dame un momentico y vuelve a escribirme en un minuto.'
        : 'Por hoy llegaste al límite de mensajes con el asistente. Si quieres seguir, escríbenos por WhatsApp y una persona del equipo te ayuda.',
    isRateLimited: true,
    citations: [],
    suggested_action: whatsappAction(),
    follow_up_questions: [],
  };
}

export async function POST(req: NextRequest) {
  try {
    // 1. Rate limiting en dos niveles por IP (ráfaga + diario). Fail-closed si Redis falla.
    const ip = getSecureIp(req);
    const burst = await checkRateLimit('chatAgent', ip);
    if (!burst.success) {
      if (burst.isError) {
        alertServiceFailureInBackground('chat', 'Rate limiter (Upstash) no disponible');
      }
      return NextResponse.json(rateLimitedReply('burst'), { status: 429 });
    }

    // 2. Validación de entrada
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

    // 3. Charla corta (hola, gracias, chao…): respuesta humana inmediata. No consume el cupo
    // diario ni tokens de Gemini, y no ensucia la analítica de demanda.
    const smallTalk = detectSmallTalk(message);
    if (smallTalk) {
      return NextResponse.json(localReply(message), { status: 200 });
    }

    const daily = await checkRateLimit('chatAgentDaily', ip);
    if (!daily.success) {
      return NextResponse.json(rateLimitedReply('daily'), { status: 429 });
    }

    // 4. Directiva de control (aislada del mensaje del usuario: anti prompt-injection)
    const contextDirective = SOLUTION_INTENT.test(message)
      ? DIRECTIVE_SOLUTION
      : DIRECTIVE_CONVERSATION;

    // 5. Configuración del microservicio (sin secretos por defecto: fail-closed)
    const agentUrl = process.env.AGENT_AI_URL;
    const hmacSecret = process.env.AGENT_HMAC_SECRET;
    if (!agentUrl || !hmacSecret || hmacSecret.length < 32) {
      logger.error('[Chat-API] AGENT_AI_URL / AGENT_HMAC_SECRET no configurados');
      alertServiceFailureInBackground('chat', 'AGENT_AI_URL / AGENT_HMAC_SECRET no configurados');
      return NextResponse.json(localReply(message), { status: 200 });
    }

    const basePayload = { message, system_directive: contextDirective, city };
    const payload = JSON.stringify({
      ...basePayload,
      history: trimHistory(history, basePayload, AGENT_PAYLOAD_BUDGET_BYTES),
    });

    // Analítica de demanda (fire-and-forget, 0 % de latencia al usuario)
    trackDemandQuery(message).catch((err) => logger.error('Error tracking demand', err));

    // 6. Firma HMAC-SHA256 (timestamp + cuerpo)
    const timestamp = Date.now().toString();
    const signature = crypto
      .createHmac('sha256', hmacSecret)
      .update(timestamp)
      .update(payload)
      .digest('hex');
    const traceId = `web-chat-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

    // 7. Invocación al microservicio de IA
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
        signal: AbortSignal.timeout(AGENT_TIMEOUT_MS),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error(`[Chat-API] Fallo del microservicio IA (${response.status}):`, errorData);
        alertServiceFailureInBackground('chat', `Motor IA respondió HTTP ${response.status}`, {
          traceId,
        });
        return NextResponse.json(localReply(message, traceId), { status: 200 });
      }

      const data = await response.json();
      if (!data || typeof data.reply !== 'string' || data.reply.trim() === '') {
        alertServiceFailureInBackground('chat', 'Motor IA devolvió una respuesta sin texto', {
          traceId,
        });
        return NextResponse.json(localReply(message, traceId), { status: 200 });
      }
      return NextResponse.json(data, { status: 200 });
    } catch (fetchError: unknown) {
      logger.error('[Chat-API] Microservicio no disponible:', fetchError);
      alertServiceFailureInBackground('chat', 'Motor IA sin respuesta (timeout o red)', {
        traceId,
      });
      return NextResponse.json(localReply(message, traceId), { status: 200 });
    }
  } catch (error: unknown) {
    logger.error('[Chat-API] Error interno inesperado:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al procesar la conversación' },
      { status: 500 }
    );
  }
}
