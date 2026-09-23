// ─────────────────────────────────────────────────────────────────────────────
// src/lib/chat/small-talk.ts — Charla corta del asistente (espejo de desmulta-ai-agent)
//
// El agente en Python ya responde saludos y charla corta de forma humana. Este módulo es
// el respaldo de la web para cuando el agente NO responde (caído, timeout, sin configurar):
// antes, un "hola" en esa situación recibía un párrafo sobre la Ley 1843.
// Seguro para cliente y servidor (sin dependencias de Node).
// ─────────────────────────────────────────────────────────────────────────────

export type SmallTalkKind = 'greeting' | 'wellbeing' | 'thanks' | 'farewell' | 'identity';

// Palabras que convierten el mensaje en una consulta real aunque empiece con un saludo
const TOPIC_HINTS = [
  'multa',
  'comparendo',
  'foto',
  'camara',
  'radar',
  'simit',
  'runt',
  'prescri',
  'caduc',
  'embargo',
  'transito',
  'pago',
  'pagar',
  'cobro',
  'deuda',
  'licencia',
  'placa',
  'carro',
  'moto',
  'tutela',
  'peticion',
  'abogad',
  'plantilla',
  'precio',
  'cuesta',
  'notific',
  'infraccion',
  'impugn',
];

// Orden = prioridad cuando coinciden varias categorías
const PATTERNS: ReadonlyArray<[SmallTalkKind, RegExp]> = [
  [
    'identity',
    /\b(quien eres|que eres|con quien hablo|como te llamas|eres (un |una )?(robot|bot|humano|persona|ia))\b/,
  ],
  ['wellbeing', /\b(como estas|como vas|como te va|que tal|todo bien)\b/],
  ['thanks', /\b(gracias|te agradezco|muy amable)\b/],
  ['farewell', /\b(chao|adios|hasta luego|hasta pronto|nos vemos|bye)\b/],
  [
    'greeting',
    /^(hola+|holi+|ola|buen(os|as)? (dia|dias|tardes?|noches?)|buenas|hey|saludos|que mas|quiubo|alo|hi|hello)\b/,
  ],
];

const MAX_SMALL_TALK_WORDS = 8;

const REPLIES: Record<SmallTalkKind, string> = {
  greeting:
    '¡Hola! 👋 Qué bueno tenerte por aquí. Cuéntame, ¿qué pasó con tu multa o comparendo? Lo revisamos con calma.',
  wellbeing:
    '¡Muy bien, gracias por preguntar! 😊 Si tienes alguna multa o comparendo que te preocupe, cuéntame.',
  thanks: '¡Con mucho gusto! Si te surge otra duda, aquí sigo. 🙌',
  farewell:
    '¡Que te vaya muy bien! 🚗 Si más adelante necesitas revisar un comparendo, aquí estaré.',
  identity:
    'Soy el asistente virtual de Desmulta 🤖. Te oriento sobre fotomultas, comparendos, prescripción y embargos de tránsito en Colombia. Si prefieres hablar con una persona, escríbenos por WhatsApp.',
};

export const STARTER_QUESTIONS = [
  'Me llegó una fotomulta, ¿es válida?',
  '¿Cuándo prescribe un comparendo?',
  'Tengo un embargo por multas, ¿qué hago?',
];

export function normalizeChatText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Devuelve la categoría de charla corta, o null si el mensaje es una consulta real. */
export function detectSmallTalk(text: string): SmallTalkKind | null {
  const norm = normalizeChatText(text);
  if (!norm || norm.split(' ').length > MAX_SMALL_TALK_WORDS) return null;
  if (TOPIC_HINTS.some((hint) => norm.includes(hint))) return null;
  for (const [kind, pattern] of PATTERNS) {
    if (pattern.test(norm)) return kind;
  }
  return null;
}

export function smallTalkReply(kind: SmallTalkKind): string {
  return REPLIES[kind];
}
