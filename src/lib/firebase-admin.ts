/**
 * Firebase Admin SDK — Singleton de inicialización segura.
 * 
 * Versión: 2.1.8 (Corrección de Linter 's' y Limpieza Atómica)
 */

import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { logger } from './logger/security-logger';

/**
 * Realiza una limpieza atómica de la llave privada.
 * Extrae solo los caracteres Base64 y reconstruye el bloque PEM desde cero.
 */
function normalizarLlavePrivada(valorCrudo: string | undefined): string {
  if (!valorCrudo) {
    throw new Error('LLAVE_PRIVADA_NO_ENCONTRADA_EN_ENTORNO');
  }

  const MARCADOR_INICIO = '-----BEGIN PRIVATE KEY-----';
  const MARCADOR_FIN = '-----END PRIVATE KEY-----';

  // 1. Convertir escapes \n en saltos reales (Usamos const para linter v2.1.8)
  const s = valorCrudo.replace(/\\n/g, '\n');

  // 2. Localizar marcadores
  const inicio = s.indexOf(MARCADOR_INICIO);
  const fin = s.indexOf(MARCADOR_FIN);

  if (inicio !== -1 && fin !== -1) {
    // 3. EXTRAER SOLO EL CONTENIDO BASE64 INTERNO
    const base64Interno = s
      .substring(inicio + MARCADOR_INICIO.length, fin)
      .replace(/[\s\r\n\t]/g, ''); // ELIMINAR CUALQUIER ESPACIO O SALTO INVISIBLE

    // 4. RECONSTRUIR EL BLOQUE PEM PERFECTO
    return `${MARCADOR_INICIO}\n${base64Interno}\n${MARCADOR_FIN}\n`;
  }

  // Fallback por si la llave ya viene limpia o procesada por Vercel
  return s.trim();
}

/**
 * Retorna la instancia de Firebase Admin.
 */
export function getAdminApp(): App {
  const appsActivas = getApps();
  if (appsActivas.length > 0) {
    return appsActivas[0];
  }

  const idProyecto = process.env.FIREBASE_PROJECT_ID;
  const emailCliente = process.env.FIREBASE_CLIENT_EMAIL;

  if (!idProyecto || !emailCliente) {
    throw new Error('[firebase-admin] Credenciales de servidor insuficientes.');
  }

  try {
    const privateKey = normalizarLlavePrivada(process.env.FIREBASE_PRIVATE_KEY);
    
    return initializeApp({
      credential: cert({ 
        projectId: idProyecto, 
        clientEmail: emailCliente, 
        privateKey 
      }),
    });
  } catch (error) {
    const detalleError = error instanceof Error ? error.message : 'Error desconocido';
    logger.error('[firebase-admin] Fallo crítico en inicialización v2.1.8:', { detalle: detalleError });
    throw error;
  }
}
