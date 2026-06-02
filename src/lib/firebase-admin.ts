/**
 * Firebase Admin SDK — Singleton de inicialización segura.
 *
 * Versión: 2.5.1 (Normalización PEM vía Regex v7.5.11)
 *
 * FIX ABSOLUTO: Si la variable de entorno colapsa a una sola línea y usa espacios
 * en lugar de saltos de línea (muy común en copy-paste a Vercel), la versión anterior
 * fallaba al separar por '\\n'. Ahora usamos extracción vía regex para garantizar
 * el formato sin importar los delimitadores de espacio originales.
 */

import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { logger } from './logger/security-logger';

/**
 * Sanitiza, reformatea y reconstruye la llave privada RSA/PKCS8 al formato
 * PEM canónico que OpenSSL 3 exige: cuerpo Base64 en líneas de 64 chars.
 * Usamos Regex para ser inmunes a llaves colapsadas en una sola línea de texto.
 * @param {string | undefined} rawKey - Llave cruda desde process.env
 * @returns {string} Llave PEM válida con cuerpo en líneas de 64 caracteres
 */
function normalizePrivateKey(rawKey: string | undefined): string {
  if (!rawKey) {
    logger.error('[firebase-admin] FIREBASE_PRIVATE_KEY no está definida o está vacía.');
    return '';
  }

  // Nivel 1: Limpieza básica de comillas y conversiones de escape explícitas
  const keyStr = rawKey
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '') // Elimina comillas
    .replace(/\\n/g, '\n') // Saltos literales a saltos reales
    .replace(/\\r/g, '\n');

  // Nivel 2: Extracción dinámica con Regex para soportar llaves de 1 sola línea con espacios
  // Captura: 1 = Header, 2 = Body, 3 = Footer (usamos [\\s\\S] para emular /s y evitar fallos TS en targets viejos)
  const pemRegex = /(-----BEGIN [A-Z ]+-----)([\s\S]*?)(-----END [A-Z ]+-----)/;
  const match = keyStr.match(pemRegex);

  logger.info('[firebase-admin] Analizando formato de llave v7.5.11:', {
    isKeyValid: keyStr.length > 100,
    hasPemMarkers: !!match,
  });

  if (match) {
    const header = match[1];
    const bodyStr = match[2];
    const footer = match[3];

    // Limpiamos TODOS los espacios ocultos, saltos de línea y ruido del cuerpo Base64
    const cleanBody = bodyStr.replace(/\s/g, '');

    if (cleanBody.length > 0) {
      // Re-estructuramos el cuerpo de forma canónica (64 caracteres exactos por línea)
      const lines = cleanBody.match(/.{1,64}/g) ?? [];
      const canonicalPem = `${header}\n${lines.join('\n')}\n${footer}\n`;
      logger.info('[firebase-admin] Llave reformateada a PEM canónico (64 chars/linea).');
      return canonicalPem;
    }
  }

  // Fallback: si no hay marcadores PEM, asumimos que es puro Base64 PKCS#8
  const base64Only = keyStr.replace(/\s/g, '');
  const lines = base64Only.match(/.{1,64}/g);

  if (lines) {
    logger.info('[firebase-admin] Reconstruyendo bloque PKCS#8 desde Base64 puro.');
    return `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----\n`;
  }

  logger.error('[firebase-admin] Formato de llave privada no reconocido. Posible corrupción.');
  return keyStr;
}

/**
 * Retorna la instancia de Firebase Admin garantizando un único singleton.
 */
export function getAdminApp(): App {
  const appsActivas = getApps();
  if (appsActivas.length > 0) {
    return appsActivas[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (!projectId || !clientEmail) {
    logger.error('[firebase-admin] Faltan credenciales críticas:', {
      projectId: !!projectId,
      clientEmail: !!clientEmail,
    });
    throw new Error('[firebase-admin] Faltan credenciales de servidor: PROJECT_ID / CLIENT_EMAIL.');
  }

  try {
    const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

    if (!privateKey) {
      throw new Error('La llave privada (FIREBASE_PRIVATE_KEY) no pudo ser procesada.');
    }

    const app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });

    logger.info('[firebase-admin] Inicialización exitosa v7.5.11');
    return app;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Fallo desconocido';
    logger.error('[firebase-admin] Error fatal de inicialización v7.5.11:', { detalle: errorMsg });
    throw error;
  }
}
