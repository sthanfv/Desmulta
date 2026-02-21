/**
 * Firebase Admin SDK — Singleton de inicialización segura.
 *
 * Este módulo garantiza que initializeApp() se llame UNA SOLA VEZ
 * en todo el servidor, independientemente de cuántas rutas API lo importen.
 *
 * MANDATO-FILTRO: sin credenciales hardcodeadas, sin console.log en producción,
 * validación estricta de env vars, parseo robusto de PEM en Windows.
 */

import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';

/**
 * Normaliza la FIREBASE_PRIVATE_KEY proveniente de .env.
 *
 * Problemas documentados en Windows / dotenv:
 * 1. dotenv NO elimina las comillas envolventes cuando el valor contiene `\n` literales.
 *    El valor llega como: `"-----BEGIN PRIVATE KEY-----\nMII..."` (con comillas).
 * 2. Los saltos de línea llegan como la secuencia `\n` (barra + n), no como newlines reales.
 * 3. Posibles CRLF en el archivo .env de Windows.
 * 4. Posibles caracteres corruptos o espacios al final del valor.
 */
function parsePrivateKey(raw: string | undefined): string {
  if (!raw) {
    throw new Error(
      '[firebase-admin] FIREBASE_PRIVATE_KEY no está definida en las variables de entorno.'
    );
  }

  const normalized = raw
    .trim() // eliminar espacios / newlines reales al inicio y fin
    .replace(/^["']+|["']+$/g, '') // eliminar comillas envolventes (simples o dobles)
    .replace(/\\n/g, '\n') // convertir `\n` literal → newline real
    .replace(/\r\n/g, '\n') // normalizar CRLF → LF
    .trim(); // segundo trim por si quedan residuos post-reemplazo

  if (!normalized.startsWith('-----BEGIN PRIVATE KEY-----')) {
    throw new Error(
      '[firebase-admin] FIREBASE_PRIVATE_KEY no tiene el formato PEM esperado. ' +
        `El valor actual comienza con: "${normalized.substring(0, 40)}"`
    );
  }

  return normalized;
}

/**
 * Retorna la instancia de Firebase Admin App (inicializando si es necesario).
 * Usar esta función en lugar de llamar initializeApp() directamente en cada ruta.
 */
export function getAdminApp(): App {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return existingApps[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (!projectId || !clientEmail) {
    throw new Error(
      '[firebase-admin] Faltan variables de entorno: FIREBASE_PROJECT_ID y/o FIREBASE_CLIENT_EMAIL.'
    );
  }

  const privateKey = parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}
