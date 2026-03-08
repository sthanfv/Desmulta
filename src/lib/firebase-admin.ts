/**
 * Firebase Admin SDK — Singleton de inicialización segura.
 * 
 * Versión: 2.1.9 (Formateo PEM Estándar 64-chars y Saneamiento)
 */

import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { logger } from './logger/security-logger';

/**
 * Normaliza la llave para que sea un bloque PEM válido de 64 caracteres por línea.
 * Esto evita el error "Unparsed DER bytes" causado por bytes residuales o falta de saltos.
 */
function normalizarLlavePrivada(valorCrudo: string | undefined): string {
  if (!valorCrudo) return '';

  // 1. Limpieza de escapes de Vercel y comillas
  const s = valorCrudo.replace(/\\n/g, '\n').replace(/^["']+|["']+$/g, '').trim();

  const INICIO = '-----BEGIN PRIVATE KEY-----';
  const FIN = '-----END PRIVATE KEY-----';

  const indiceInicio = s.indexOf(INICIO);
  const indiceFin = s.indexOf(FIN);

  if (indiceInicio !== -1 && indiceFin !== -1) {
    // 2. Extraer solo el contenido base64 puro (sin espacios ni saltos previos)
    const base64Puro = s
      .substring(indiceInicio + INICIO.length, indiceFin)
      .replace(/[^A-Za-z0-9+/=]/g, '');

    // 3. Re-formatear en bloques de 64 caracteres (estándar RFC 7468)
    const lineas = base64Puro.match(/.{1,64}/g);
    if (lineas) {
      return `${INICIO}\n${lineas.join('\n')}\n${FIN}`;
    }
  }

  // Fallback si no hay marcadores (peligroso, pero intentamos que funcione)
  return s;
}

/**
 * Retorna la instancia de Firebase Admin.
 */
export function getAdminApp(): App {
  const appsActivas = getApps();
  if (appsActivas.length > 0) {
    return appsActivas[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (!projectId || !clientEmail) {
    throw new Error('[firebase-admin] Faltan credenciales de servidor: PROJECT_ID / CLIENT_EMAIL.');
  }

  try {
    const privateKey = normalizarLlavePrivada(process.env.FIREBASE_PRIVATE_KEY);
    
    return initializeApp({
      credential: cert({ 
        projectId, 
        clientEmail, 
        privateKey 
      }),
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Fallo desconocido';
    logger.error('[firebase-admin] Error fatal de inicialización v2.1.9:', { detalle: errorMsg });
    throw error;
  }
}
