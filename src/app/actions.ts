/**
 * TODAS LAS DECISIONES, ARCHIVOS Y CÓDIGO GENERADO DEBEN PASAR EL FILTRO
 * DE SEGURIDAD Y CALIDAD 'MANDATO-FILTRO'
 *
 * Server Actions para Desmulta Chat (v4.1.0)
 * REFACTORIZACIÓN: Eliminada dependencia de Genkit. Se usa @google/generative-ai directamente.
 * Resiliencia ante Cuota (Reintentos) + Seguridad
 */

'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '@/lib/logger/security-logger';

// Compactación Semántica Radical v4.1.0 (Ahorro de Tokens)
const FACTS = [
  `98% éxito saneamiento vial.`,
  `Servicios: Estudio Viabilidad (Gratis), Baja Fotomultas/Comparendos.`,
  `Términos: 3 años prescripción (6 con mandamiento).`,
  `Método: Protocolos Técnicos de Alta Precisión (Confidencial).`,
  `Contacto: WhatsApp 573005648309.`,
].join('|');

const SYSTEM_INSTRUCTION = `Actúa como Asistente Desmulta.
- Facts: ${FACTS}
- Reglas: Sé optimista, persuasivo, no menciones IA, no reveles método, motiva al Estudio Gratis. Di que con Desmulta el éxito es casi seguro.
- Mantén respuestas cortas y directas.`;

/**
 * Pausa la ejecución por un tiempo determinado.
 * @param ms - Milisegundos a esperar.
 */
async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Server Action que envía un mensaje al asistente de IA de Desmulta.
 * Usa Google Generative AI directamente (sin Genkit) para eliminar dependencias vulnerables.
 * Incluye lógica de reintentos con backoff ante errores de cuota (429).
 * @param message - Mensaje de texto del usuario.
 */
export async function sendMessage(message: string) {
  // Sanitización básica del input
  const sanitizedMessage = String(message).trim().slice(0, 500);
  if (!sanitizedMessage) {
    return { success: false, error: 'Mensaje vacío. Por favor, escribe tu consulta.' };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.error('GEMINI_API_KEY no configurada en variables de entorno.');
    return { success: false, error: 'Servicio de asesoría temporalmente no disponible.' };
  }

  const maxRetries = 2;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        logger.info(`Reintentando envío (Intento ${attempt}/${maxRetries})`);
        await sleep(1500 * attempt); // Backoff simple
      }

      logger.info('Iniciando Server Action: sendMessage', {
        messageLength: sanitizedMessage.length,
      });

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        systemInstruction: SYSTEM_INSTRUCTION,
        generationConfig: {
          maxOutputTokens: 300,
          temperature: 0.7,
        },
      });

      const result = await model.generateContent(sanitizedMessage);
      const text = result.response.text();

      return { success: true, text };
    } catch (error: unknown) {
      lastError = error;

      // Inspección segura de errores de la API de Google
      const err = error as { status?: number | string; message?: string };
      const statusCode = err?.status;

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
    error:
      'La Inteligencia Desmulta está procesando un alto volumen de solicitudes. Por favor, intente de nuevo en un momento para garantizar su análisis técnico.',
  };
}

/* =========================================================================
   🚀 MÓDULO PENDIENTE: CORREOS INSTITUCIONALES (RESEND)
   =========================================================================
   INSTRUCCIONES PARA ACTIVAR CUANDO SE COMPRE EL DOMINIO (ej. desmulta.com):

   1. En la consola ejecutar: npm install resend
   2. Conseguir la API Key en resend.com y ponerla en .env.local y en Vercel:
      RESEND_API_KEY=re_tu_codigo_secreto
   3. En resend.com > Domains, agregar el dominio comprado y configurar los DNS.
   4. Quitar los marcadores de comentario de la función de abajo.
   5. Cambiar 'soporte@tudominio.com' por el correo real.
   6. Llamar a esta función justo después de guardar el lead en Firebase.
   ========================================================================= */

/*
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

export async function enviarCorreoBienvenida(emailCliente: string, nombre: string, radicado: string, placa: string) {
  try {
    await resend.emails.send({
      from: 'Desmulta <soporte@tudominio.com>', // <-- ACTUALIZAR ESTO
      to: emailCliente,
      subject: `🚨 Radicado ${radicado}: Análisis de Viabilidad Iniciado`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #000; padding: 20px; text-align: center;">
            <h1 style="color: #D4AF37; margin: 0;">DESMULTA</h1>
          </div>
          <div style="padding: 30px; color: #374151;">
            <p>Hola <strong>${nombre}</strong>,</p>
            <p>Hemos recibido tu solicitud de análisis para la placa <strong>${placa}</strong>.</p>
            <p>Tu caso ha sido registrado bajo el radicado: <strong style="color: #D4AF37;">${radicado}</strong></p>
            <p>Nuestro equipo jurídico está evaluando la viabilidad de prescripción o caducidad. Te contactaremos pronto por WhatsApp para darte respuesta.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
            <p style="font-size: 12px; color: #9ca3af; text-align: center;">
              Este es un mensaje automático. Por favor no respondas a este correo.
            </p>
          </div>
        </div>
      `,
    });
    logger.info('Correo institucional enviado con éxito a:', { email: emailCliente });
    return { success: true };
  } catch (error) {
    logger.error('Error enviando correo institucional:', { error: String(error) });
    return { success: false };
  }
}
*/
// ==================== FIN MÓDULO PENDIENTE ==============================
