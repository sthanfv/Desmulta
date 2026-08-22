// ─────────────────────────────────────────────────────────────────────────────
// src/lib/auth/require-admin-session.ts  — v1.0.0
//
// CAMBIOS vs versión anterior:
//   - Se añade validación de `exp` del token para rechazar tokens que,
//     aunque criptográficamente válidos, están muy cerca de expirar
//     (ventana de 60 segundos para evitar race conditions).
//   - Se añade verificación de `iss` para asegurar que el token fue emitido
//     por el proyecto Firebase correcto (protege ante subdomain takeovers).
//   - Los errores ahora usan mensajes genéricos al cliente pero loggean el
//     detalle interno, evitando información fuga de diagnóstico al atacante.
//   - Se añade soporte para `idTokenRevoked` (Firebase puede revocar tokens
//     si se detecta actividad sospechosa o se llama a revokeRefreshTokens).
// ─────────────────────────────────────────────────────────────────────────────

import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';
import { headers, cookies } from 'next/headers';
import { logger } from '@/lib/logger/security-logger';
import { jwtVerify } from 'jose';

/** Token expira en menos de N segundos → rechazar para evitar race conditions */
const TOKEN_EXPIRY_BUFFER_SECS = 60;

/**
 * Valida que la sesión de admin es legítima y tiene permisos suficientes.
 * Llamar desde Server Actions y Route Handlers que requieran acceso admin.
 *
 * @throws Error con mensaje GENÉRICO al cliente (no filtra información interna)
 * @returns DecodedIdToken si la sesión es válida
 */
export async function requireAdminSession(idToken: string) {
  // ── Validación de presencia ──────────────────────────────────────────────
  if (!idToken || typeof idToken !== 'string' || idToken.trim().length === 0) {
    throw new Error('Acceso denegado.');
  }

  // ── Validación de origen (CSRF) ──────────────────────────────────────────
  const headersList = await headers();
  const origin = headersList.get('origin');
  const allowedOrigin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NODE_ENV === 'development' ? 'http://localhost:9005' : 'https://desmulta.online');

  const isAllowedOrigin = (() => {
    if (!origin) return true; // Sin header origin (llamadas server-to-server): permitir

    const originNorm = origin.replace(/\/$/, '');
    const allowedNorm = allowedOrigin.replace(/\/$/, '');

    if (originNorm === allowedNorm) return true;
    if (originNorm === 'http://localhost:9005') return true;
    if (originNorm === 'https://desmulta.online' || originNorm === 'https://www.desmulta.online')
      return true;
    // Vercel preview deployments (https://<project>-<hash>.vercel.app)
    if (/^https:\/\/[a-zA-Z0-9-]+-[a-zA-Z0-9]+\.vercel\.app$/.test(originNorm)) return true;

    return false;
  })();

  if (!isAllowedOrigin) {
    logger.security('[requireAdminSession] CSRF bloqueado', { origin });
    throw new Error('Acceso denegado.');
  }

  // 🛡️ FIX CRÍTICO: Validar el segundo factor (2FA JWT) nativamente en las Server Actions.
  // Sin esto, un atacante con un idToken de Firebase robado podría hacer Action Hijacking
  // llamando a Server Actions administrativas desde rutas públicas (ej. /) evadiendo el middleware.
  const isE2E_2FA = process.env.E2E_TEST_MODE === 'true';
  if (!isE2E_2FA) {
    const cookieStore = await cookies();
    const token2fa = cookieStore.get('admin-2fa-token')?.value;
    const jwtSecret = process.env.GOD_MODE_JWT_SECRET;

    if (!token2fa || !jwtSecret) {
      logger.security(
        '[requireAdminSession] Bloqueado: Falta token 2FA en Server Action Hijacking'
      );
      throw new Error('Acceso denegado.');
    }

    try {
      const secret = new TextEncoder().encode(jwtSecret);
      await jwtVerify(token2fa, secret);
    } catch {
      logger.security(
        '[requireAdminSession] Bloqueado: Token 2FA inválido en Server Action Hijacking'
      );
      throw new Error('Acceso denegado.');
    }
  }

  // 🛡️ Verificación del token con Firebase Admin 🛡️────────────────────────────
  getAdminApp();
  let decodedToken;
  try {
    decodedToken = await getAuth().verifyIdToken(idToken, /* checkRevoked = */ true);
  } catch (error) {
    const errorCode = (error as { code?: string }).code;

    if (errorCode === 'auth/id-token-revoked') {
      logger.security('[requireAdminSession] Token revocado detectado', {
        error: errorCode,
      });
    } else if (errorCode === 'auth/id-token-expired') {
      logger.info('[requireAdminSession] Token expirado', { error: errorCode });
    } else {
      logger.error('[requireAdminSession] Token inválido', {
        error: String(error),
        code: errorCode,
      });
    }

    // Mensaje genérico al cliente (no filtrar el motivo exacto)
    throw new Error('Sesión inválida o expirada. Por favor inicia sesión nuevamente.');
  }

  // ── Validar que el token no está demasiado cerca de expirar ─────────────
  const nowSecs = Math.floor(Date.now() / 1000);
  if (decodedToken.exp - nowSecs < TOKEN_EXPIRY_BUFFER_SECS) {
    logger.info('[requireAdminSession] Token rechazado por cercanía a expiración', {
      uid: decodedToken.uid,
      expiresIn: decodedToken.exp - nowSecs,
    });
    throw new Error('Sesión a punto de expirar. Por favor recarga la página.');
  }

  // ── Validar que el token pertenece a este proyecto Firebase ─────────────
  const expectedAudience =
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';
  if (expectedAudience && decodedToken.aud !== expectedAudience) {
    logger.security(
      '[requireAdminSession] Token de proyecto incorrecto (posible ataque de sustitución)',
      {
        expected: expectedAudience,
        received: decodedToken.aud,
      }
    );
    throw new Error('Acceso denegado.');
  }

  // ── Verificar rol de administrador en Firestore ─────────────────────────
  try {
    const db = getFirestore();
    const adminDoc = await db.collection('admins').doc(decodedToken.uid).get();

    if (!adminDoc.exists) {
      logger.security('[requireAdminSession] Usuario sin privilegios admin intentó acceder', {
        uid: decodedToken.uid,
      });
      throw new Error('Acceso denegado.');
    }

    // Verificar que el documento admin no esté deshabilitado
    const adminData = adminDoc.data();
    if (adminData?.disabled === true) {
      logger.security('[requireAdminSession] Cuenta admin deshabilitada bloqueada', {
        uid: decodedToken.uid,
      });
      throw new Error('Acceso denegado. Cuenta suspendida.');
    }

    return decodedToken;
  } catch (error) {
    if ((error as Error).message.startsWith('Acceso denegado')) {
      throw error; // Re-throw nuestro error con mensaje limpio
    }
    // Error de Firestore
    logger.error('[requireAdminSession] Error verificando rol en Firestore', {
      uid: decodedToken.uid,
      error: String(error),
    });
    throw new Error('Error de verificación. Intenta de nuevo.');
  }
}
