/**
 * Firebase Admin SDK — Singleton de inicialización segura.
 *
 * MANDATO-FILTRO: Sin credenciales hardcodeadas, validación estricta, 
 * parseo robusto de PEM para evitar errores de ASN.1 en producción.
 */

import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { logger } from './logger/security-logger';

/**
 * Normaliza la FIREBASE_PRIVATE_KEY. 
 * El error 'Unparsed DER bytes remain after ASN.1 parsing' ocurre cuando
 * la llave tiene basura al final o saltos de línea mal formados.
 */
function parsePrivateKey(rawValue: string | undefined): string {
  if (!rawValue) {
    throw new Error('[firebase-admin] FIREBASE_PRIVATE_KEY no definida.');
  }

  // 1. Limpiar comillas accidentales y espacios extremos
  let key = rawValue.trim().replace(/^["']+|["']+$/g, '');

  // 2. Convertir secuencias literales \n en saltos de línea reales
  key = key.replace(/\\n/g, '\n');

  // 3. Normalizar saltos de línea Windows CRLF a Unix LF
  key = key.replace(/\r\n/g, '\n');

  // 4. LIMPIEZA CRÍTICA: Eliminar espacios en blanco al final de cada línea
  // Esto es lo que suele causar el error "Unparsed DER bytes"
  const lines = key.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const cleanKey = lines.join('\n');

  // 5. Validación de seguridad básica
  if (!cleanKey.includes('BEGIN PRIVATE KEY') || !cleanKey.includes('END PRIVATE KEY')) {
    logger.error('[firebase-admin] La llave privada parece estar mal formada (faltan marcadores BEGIN/END).');
  }

  return cleanKey;
}

/**
 * Retorna la instancia de Firebase Admin App.
 */
export function getAdminApp(): App {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return existingApps[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (!projectId || !clientEmail) {
    throw new Error('[firebase-admin] Credenciales de Admin incompletas.');
  }

  try {
    const privateKey = parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
    
    return initializeApp({
      credential: cert({ 
        projectId, 
        clientEmail, 
        privateKey 
      }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    logger.error('[firebase-admin] Fallo crítico al inicializar Firebase Admin:', { error: msg });
    throw err;
  }
}
