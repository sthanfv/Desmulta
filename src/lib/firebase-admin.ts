/**
 * Firebase Admin SDK — Singleton de inicialización segura.
 * 
 * Versión: 2.1.4 (Saneamiento de Llave ASN.1)
 */

import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { logger } from './logger/security-logger';

/**
 * Normalización agresiva de la llave privada.
 * Extrae solo los datos base64 para evitar el error "Unparsed DER bytes".
 */
function normalizarLlavePrivada(llaveCruda: string | undefined): string {
  if (!llaveCruda) {
    throw new Error('VARIABLE_FIREBASE_PRIVATE_KEY_AUSENTE');
  }

  // 1. Limpiar rastro de escapes y comillas de Vercel/Node
  let limpio = llaveCruda.replace(/\\n/g, '\n').replace(/^["']+|["']+$/g, '').trim();

  // 2. Extraer solo el contenido entre los marcadores para ignorar basura DER externa
  const match = limpio.match(/-----BEGIN PRIVATE KEY-----([\s\S]*)-----END PRIVATE KEY-----/);
  
  if (!match) {
    // Si no tiene marcadores, intentamos limpiar la basura de todas formas línea por línea
    logger.warn('[firebase-admin] La llave no tiene marcadores estándar. Intentando limpieza agresiva.');
    const base64Pure = limpio
      .split('\n')
      .map(linea => linea.trim())
      .filter(linea => linea.length > 0 && !linea.includes('-----'))
      .join('');
    return `-----BEGIN PRIVATE KEY-----\n${base64Pure}\n-----END PRIVATE KEY-----\n`;
  }

  // 3. Reconstruir la llave desde el contenido base64 interno (el bloque del medio)
  const contenidoBase64 = match[1]
    .split('\n')
    .map(linea => linea.trim())
    .filter(linea => linea.length > 0)
    .join('\n');

  return `-----BEGIN PRIVATE KEY-----\n${contenidoBase64}\n-----END PRIVATE KEY-----\n`;
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
    throw new Error('[firebase-admin] Faltan credenciales esenciales en el entorno.');
  }

  try {
    const privateKey = normalizarLlavePrivada(process.env.FIREBASE_PRIVATE_KEY);
    
    return initializeApp({
      credential: cert({ 
        projectId: idProyecto, 
        clientEmail: emailCliente, 
        privateKey: privateKey 
      }),
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
    logger.error('[firebase-admin] Fallo crítico de inicialización:', { detalle: errorMsg });
    throw error;
  }
}
