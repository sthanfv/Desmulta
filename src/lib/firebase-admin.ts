/**
 * Firebase Admin SDK — Singleton de inicialización segura.
 *
 * Versión: 2.3.4 (Estabilización Local y Producción)
 */

import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { logger } from './logger/security-logger';

/**
 * Normaliza la llave para que sea un bloque PEM válido de 64 caracteres por línea.
 * Esto evita el error "Unparsed DER bytes" causado por bytes residuales o falta de saltos.
 */
function normalizarLlavePrivada(valorCrudo: string | undefined): string {
  if (!valorCrudo) return '';

  // 1. Limpieza agresiva de escapes y comillas.
  // En Vercel, a veces las variables vienen con comillas dobles literales o doble escape \\n.
  const s = valorCrudo
    .replace(/\\n/g, '\n') // Unescape literal \n
    .replace(/\\n/g, '\n') // Doble unescape por si acaso
    .replace(/^["']+|["']+$/g, '') // Eliminar comillas extremas
    .trim();

  const INICIO = '-----BEGIN PRIVATE KEY-----';
  const FIN = '-----END PRIVATE KEY-----';

  // Si ya tiene el formato correcto PEM con saltos de línea reales, aseguramos que termine en salto único
  if (s.includes(INICIO) && s.includes(FIN)) {
    // Si contiene saltos de línea reales, confiamos en el formato pero limpiamos basura al final
    if (s.includes('\n')) {
      return s.split(FIN)[0] + FIN + '\n';
    }

    // Si está todo en una sola línea pero tiene los marcadores, re-formateamos
    const base64Puro = s.split(INICIO)[1].split(FIN)[0].replace(/\s/g, ''); // Eliminar cualquier espacio

    const lineas = base64Puro.match(/.{1,64}/g);
    if (lineas) {
      return `${INICIO}\n${lineas.join('\n')}\n${FIN}\n`;
    }
  }

  // Fallback de emergencia: Si no tiene marcadores, intentamos limpiar y añadir
  return (s.includes('\n') ? s : s.replace(/\\n/g, '\n')) + '\n';
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

    const app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });

    logger.info('[firebase-admin] Inicialización exitosa v2.3.4');
    return app;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Fallo desconocido';
    logger.error('[firebase-admin] Error fatal de inicialización v2.3.4:', { detalle: errorMsg });
    throw error;
  }
}
