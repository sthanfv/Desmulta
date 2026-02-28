/**
 * TODAS LAS DECISIONES, ARCHIVOS Y CÓDIGO GENERADO DEBEN PASAR EL FILTRO
 * DE SEGURIDAD Y CALIDAD ‘MANDATO-FILTRO’
 *
 * Server Actions para Desmulta Chat (v4.0.0)
 */

'use server';

import { chatFlow } from '@/ai/flows/chat-with-ai';
import { logger } from '@/lib/logger/security-logger';

export async function sendMessage(message: string) {
  try {
    logger.info('Iniciando Server Action: sendMessage', { messageLength: message.length });

    // Ejecución del flujo de Genkit
    const response = await chatFlow({ message });

    return { success: true, text: response };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error en Server Action sendMessage', { error: errorMessage });
    return {
      success: false,
      error:
        'Estamos analizando un alto volumen de casos en este momento. Por favor, intente de nuevo en 30 segundos para garantizar la precisión de su respuesta.',
    };
  }
}
