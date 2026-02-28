/**
 * TODAS LAS DECISIONES, ARCHIVOS Y CÓDIGO GENERADO DEBEN PASAR EL FILTRO
 * DE SEGURIDAD Y CALIDAD ‘MANDATO-FILTRO’
 * 
 * Server Actions para Desmulta Chat (v4.0.8)
 * Resiliencia ante Cuota (Reintentos) + Seguridad
 */

'use server';

import { chatFlow } from '@/ai/flows/chat-with-ai';
import { logger } from '@/lib/logger/security-logger';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function sendMessage(message: string) {
  const maxRetries = 2;
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        logger.info(`Reintentando envío (Intento ${attempt}/${maxRetries})`);
        await sleep(1500 * attempt); // Backoff simple
      }

      logger.info('Iniciando Server Action: sendMessage', { messageLength: message.length });
      const response = await chatFlow({ message });
      return { success: true, text: response };

    } catch (error: any) {
      lastError = error;
      const statusCode = (error as any)?.code || (error as any)?.status;

      // Si no es un error de cuota (429), no reintentamos
      if (statusCode !== 429 && statusCode !== 'RESOURCE_EXHAUSTED') {
        break;
      }

      logger.warn(`Límite de cuota alcanzado en intento ${attempt}`);
    }
  }

  // Si llegamos aquí, fallaron todos los intentos o el error no era reintentable
  const errorMessage = lastError instanceof Error ? lastError.message : 'Unknown error';
  logger.error('Fallo definitivo en Server Action sendMessage', { error: errorMessage });

  return {
    success: false,
    error: 'La Inteligencia Desmulta está procesando un alto volumen de solicitudes de éxito. Por favor, intente de nuevo en un momento para garantizar su análisis técnico.',
  };
}
