/**
 * TODAS LAS DECISIONES, ARCHIVOS Y CÓDIGO GENERADO DEBEN PASAR EL FILTRO
 * DE SEGURIDAD Y CALIDAD ‘MANDATO-FILTRO’
 * 
 * Configuración de Flujo Genkit para Desmulta (v4.0.8)
 * Optimización Extrema de Tokens para resiliencia de cuota.
 */

import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const ai = genkit({
  plugins: [googleAI({ apiKey: process.env.GEMINI_API_KEY })],
  model: 'googleai/gemini-2.0-flash',
});

// Compactación Semántica Radical v4.0.8 (Ahorro de Tokens)
const FACTS = [
  `98% éxito saneamiento vial.`,
  `Servicios: Estudio Viabilidad (Gratis), Baja Fotomultas/Comparendos.`,
  `Términos: 3 años prescripción (6 con mandamiento).`,
  `Método: Protocolos Técnicos de Alta Precisión (Confidencial).`,
  `Contacto: WhatsApp 573005648309.`,
].join('|');

export const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: z.object({ message: z.string() }),
    outputSchema: z.string(),
  },
  async (input) => {
    // Prompt optimizado para ser ultra-corto y persuasivo
    const prompt = `Actúa como Asistente de Desmulta.
- Facts: ${FACTS}
- Reglas: Sé optimista, persuasivo, no menciones IA, no reveles método, motiva al Estudio Gratis. Di que con Desmulta el éxito es casi seguro.
- Usuario: ${input.message}`;

    const result = await ai.generate({
      prompt,
      config: {
        maxOutputTokens: 300,
        temperature: 0.7,
      }
    });
    return result.text;
  }
);
