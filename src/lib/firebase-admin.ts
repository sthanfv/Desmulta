/**
 * Firebase Admin SDK — Singleton de inicialización segura.
 * 
 * Versión: 2.1.6 (Estabilización Quirúrgica de Llave RSA)
 */

import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { logger } from './logger/security-logger';

/**
 * Realiza un corte exacto en la llave para evitar bytes sobrantes (ASN.1 error).
 * Esta función es la "tijera" definitiva contra la basura DER de Vercel.
 */
function normalizarLlavePrivada(llaveCruda: string | undefined): string {
  if (!llaveCruda) {
    throw new Error('VARIABLE_FIREBASE_PRIVATE_KEY_AUSENTE');
  }

  // 1. Limpiar rastro de escapes de red y comillas envolventes
  let k = llaveCruda.replace(/\\n/g, '\n').replace(/^["']+|["']+$/g, '').trim();

  // 2. CORTE QUIRÚRGICO: Localizar el marcador de cierre exacto
  const marcadorFin = '-----END PRIVATE KEY-----';
  const indiceFin = k.indexOf(marcadorFin);

  if (indiceFin !== -1) {
    // Cortamos TODO lo que esté después del marcador de fin.
    // No permitimos ni un solo espacio ni salto de línea extra.
    k = k.substring(0, indiceFin + marcadorFin.length);
  }

  return k;
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
    throw new Error('[firebase-admin] Faltan credenciales de servidor (ProjectID/Email).');
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
    const errorMsg = error instanceof Error ? error.message : 'Fallo desconocido';
    logger.error('[firebase-admin] Error fatal de inicialización:', { detalle: errorMsg });
    throw error;
  }
}
