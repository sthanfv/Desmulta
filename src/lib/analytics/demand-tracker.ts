import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger/security-logger';

// 1. Instancia de Upstash Redis (Memoria Edge)
const redis = Redis.fromEnv();

// 2. Diccionario Heurístico de Temas (Regex)
const TOPIC_RULES = [
  {
    id: 'embargos',
    label: 'Embargos y Coactivos',
    regex: /(embargo|embargad[oa]|congelar|retencion|bancolombia|nequi|daviplata|banco|cuenta bancaria|coactivo)/i,
  },
  {
    id: 'prescripcion',
    label: 'Prescripción (> 3 años)',
    regex: /(prescripcion|prescribir|prescribe|caducidad|caducar|3 a[ñn]os|tres a[ñn]os|viejo|antiguo|2019|2020|2021|borrar)/i,
  },
  {
    id: 'fotomultas',
    label: 'Fotomultas y Notificación',
    regex: /(fotomulta|c[aá]mara|foto|c-038|notificaci[oó]n|notificado|correo|runt|sancion|comparendo electronico|multa electronica)/i,
  },
  {
    id: 'radares_ansv',
    label: 'Radares ANSV',
    regex: /(radar|velocidad|ansv|permiso|calibraci[oó]n|metrolog[ií]a|autorizaci[oó]n|legalidad|senalizacion|se[ñn]al)/i,
  },
  {
    id: 'alcoholemia',
    label: 'Alcoholemia',
    regex: /(alcohol|alcoholemia|embriaguez|grado|cerveza|licor|suspension|suspender|borracho)/i,
  },
  {
    id: 'acuerdos_pago',
    label: 'Acuerdos de Pago',
    regex: /(acuerdo|pago|cuotas|descuento|amnistia|pagar|rebaja|intereses|mora)/i,
  },
  {
    id: 'licencias',
    label: 'Licencias y SOAT',
    regex: /(licencia|pase|soat|traspaso|curso pedag[oó]gico|curso|renovar)/i,
  }
];

// 3. Diccionario Heurístico de Ciudades Principales
const CITIES = [
  'bogota', 'medellin', 'cali', 'barranquilla', 'cartagena', 
  'cucuta', 'bucaramanga', 'pereira', 'santa marta', 'ibague', 
  'pasto', 'manizales', 'neiva', 'villavicencio', 'armenia', 
  'valledupar', 'popayan', 'sincelejo', 'floridablanca', 'palmira',
  'bello', 'soacha', 'envigado', 'itagui', 'soledad'
];

/**
 * Procesa un mensaje del usuario y extrae la intención (tema) y la ciudad,
 * registrándolo atómicamente en Upstash Redis para analítica a costo cero.
 * @param message Mensaje enviado por el usuario
 */
export async function trackDemandQuery(message: string): Promise<void> {
  if (!message || message.length < 5) return;

  try {
    const textToAnalyze = message.toLowerCase();
    
    // 1. Detectar Tema
    let topicId = 'otros';
    for (const rule of TOPIC_RULES) {
      if (rule.regex.test(textToAnalyze)) {
        topicId = rule.id;
        break; // Detener en la primera coincidencia de mayor peso
      }
    }

    // 2. Detectar Ciudad
    let cityId = 'no_identificada';
    // Reemplaza tildes para búsqueda de ciudad
    const normalizedText = textToAnalyze.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    for (const city of CITIES) {
      if (normalizedText.includes(city)) {
        cityId = city;
        break;
      }
    }

    // 3. Obtener el mes actual (e.g., "2026-08")
    const date = new Date();
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    // 4. Conteo Atómico en Upstash Redis (Pipeline para agrupar comandos en 1 sola red)
    const pipeline = redis.pipeline();
    
    // Incrementar Contador Global Mensual
    pipeline.incr(`analytics:demand:total:${monthKey}`);
    
    // Incrementar Contador por Tema
    pipeline.hincrby(`analytics:demand:topics:${monthKey}`, topicId, 1);
    
    // Incrementar Contador por Ciudad (si fue identificada)
    if (cityId !== 'no_identificada') {
      pipeline.hincrby(`analytics:demand:cities:${monthKey}`, cityId, 1);
    }

    // Ejecutar Pipeline (Demora < 5ms)
    await pipeline.exec();

  } catch (error) {
    // Si falla el tracker, fallamos en silencio (Fail-Open) para no bloquear al usuario
    logger.error('[demand-tracker] Error registrando analítica:', { error: error instanceof Error ? error.message : String(error) });
  }
}

export function getDemandTopicLabel(topicId: string): string {
  const rule = TOPIC_RULES.find(r => r.id === topicId);
  return rule ? rule.label : 'Otros Trámites';
}
