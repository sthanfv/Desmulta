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
import { verifyAdminToken } from '@/lib/auth/admin-jwt';

/** Token expira en menos de N segundos → rechazar para evitar race conditions */
const TOKEN_EXPIRY_BUFFER_SECS = 60;

/**
 * Valida idToken + rol admin + 2FA (admin-2fa-token con aud correcta y MISMO uid).
 * Llamar desde Server Actions y Route Handlers que requieran acceso admin.
 *
 * [2026-09-22] FIX: antes el 2FA se validaba con jwtVerify genérico (aceptaba
 * temp_token o god-mode token) y ANTES de conocer el uid (no había binding).
 *
 * @throws Error con mensaje GENÉRICO al cliente (no filtra información interna)
 * @returns DecodedIdToken si la sesión es válida
 */
export async function requireAdminSession(idToken: string) {
  const decodedToken = await verifyAdminIdToken(idToken);

  // Bypass E2E solo fuera de Vercel (el middleware ya aborta si E2E está activo en Vercel)
  if (process.env.E2E_TEST_MODE === 'true' && !process.env.VERCEL_ENV) {
    return decodedToken;
  }

  const cookieStore = await cookies();
  const payload = await verifyAdminToken(cookieStore.get('admin-2fa-token')?.value, 'admin-2fa');
  if (!payload || payload.uid !== decodedToken.uid) {
    logger.security('[requireAdminSession] Bloqueado: 2FA ausente, inválido o de otro usuario', {
      uid: decodedToken.uid,
    });
    throw new Error('Acceso denegado.');
  }

  return decodedToken;
}

/**
 * Valida SOLO idToken + rol admin (SIN segundo factor).
 * ⚠️ Usar ÚNICAMENTE en el flujo previo al OTP (pre-login / envío de OTP).
 * Antes pre-login llamaba requireAdminSession, que exigía un 2FA previo:
 * desde un navegador limpio el login fallaba siempre con 401.
 */
export async function verifyAdminIdToken(idToken: string) {
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

  // (El segundo factor se valida en requireAdminSession, ya con el uid conocido.)

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
