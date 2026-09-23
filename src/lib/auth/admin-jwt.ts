// ─────────────────────────────────────────────────────────────────────────────
// src/lib/auth/admin-jwt.ts — [2026-09-22] Auditoría: fix de confusión de tokens
//
// PROBLEMA QUE RESUELVE:
//   temp_token (pre-OTP), admin-2fa-token y admin-god-mode-token se firmaban con
//   el MISMO secreto y se verificaban con jwtVerify(token, secret) SIN validar
//   propósito. Resultado: cualquier token servía para cualquier puerta:
//     - admin-2fa-token (cualquier operador) → pegado como admin-god-mode-token
//       → grantAdminAccessByEmail / revokeAdminAccess / logs de auditoría.
//     - admin-god-mode-token (solo contraseña) → pegado como admin-2fa-token
//       → se salta el OTP por correo.
//
// SOLUCIÓN: cada token lleva `iss` + `aud` y se verifica exigiendo ambos y el
// algoritmo. Compatible con Edge Runtime (middleware) — solo usa jose + TextEncoder.
// ─────────────────────────────────────────────────────────────────────────────

// Subrutas de jose: el índice raíz arrastra JWE (CompressionStream) y Next avisa en Edge Runtime
import { SignJWT } from 'jose/jwt/sign';
import { jwtVerify } from 'jose/jwt/verify';
import type { JWTPayload } from 'jose';

export type AdminTokenAudience = 'otp-pending' | 'admin-2fa' | 'god-mode' | 'operator-pin';

const ISSUER = 'desmulta-admin';

function getSecret(): Uint8Array {
  const raw = process.env.GOD_MODE_JWT_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error('GOD_MODE_JWT_SECRET ausente o menor a 32 caracteres');
  }
  return new TextEncoder().encode(raw);
}

export async function signAdminToken(
  audience: AdminTokenAudience,
  claims: Record<string, unknown>,
  ttl: string
): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(ISSUER)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(getSecret());
}

/**
 * Verifica firma, expiración, emisor, audiencia y algoritmo.
 * Devuelve el payload o null (nunca lanza).
 */
export async function verifyAdminToken(
  token: string | undefined | null,
  audience: AdminTokenAudience
): Promise<JWTPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: ISSUER,
      audience,
      algorithms: ['HS256'],
    });
    return payload;
  } catch {
    return null;
  }
}
