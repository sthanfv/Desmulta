import { GoogleGenerativeAI } from '@google/generative-ai';

// Configuración directa de Google Generative AI (v5.1 - No Genkit dependency)
const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);
// Usamos el nombre del modelo sin parámetros de versión para dejar que el SDK v0.24 decida el mejor endpoint (v1)
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export interface ViabilityInput {
  antiquity: string;
  type: string;
  coactive: string;
}

export interface ViabilityAnalysis {
  score: number;
  rationale: string;
  recommendation: 'PROCEDER' | 'ESTUDIO_PROFUNDO' | 'DESCARTAR';
}

/**
 * Motor de IA Predictiva de Desmulta (v5.1)
 * Realiza un análisis técnico basado en heurísticas legales colombianas.
 */
export async function analyzeViabilityFlow(input: ViabilityInput): Promise<ViabilityAnalysis> {
  const { antiquity, type, coactive } = input;

  const prompt = `
    Analiza la viabilidad de sanear un comparendo en Colombia:
    - Antigüedad: ${antiquity}
    - Tipo: ${type}
    - Coactiva: ${coactive}

    REGLAS:
    - > 3 años: Alta probabilidad (por prescripción).
    - Foto-Multas: Más fáciles de impugnar.
    - Coactiva SÍ: Baja probabilidad si es reciente (< 1 año).

    RESPUESTA: JSON PURO con score (0-100), rationale (máx 15 palabras), y recommendation (PROCEDER/ESTUDIO_PROFUNDO/DESCARTAR).
  `;

  if (!apiKey) {
    return {
      score: 50,
      rationale: 'API Key no configurada. Requiere revisión manual.',
      recommendation: 'ESTUDIO_PROFUNDO',
    };
  }

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Extracción robusta de JSON del texto de Gemini
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in AI response');

    const analysis = JSON.parse(jsonMatch[0]) as ViabilityAnalysis;
    return analysis;
  } catch (error) {
    console.error('[AI-MOTOR] Error:', error);
    // Fallback de seguridad (Graceful Degradation)
    return {
      score: 50,
      rationale: 'Error en análisis automático. Requiere revisión manual.',
      recommendation: 'ESTUDIO_PROFUNDO',
    };
  }
}
