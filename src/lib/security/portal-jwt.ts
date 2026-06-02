import { SignJWT, jwtVerify } from 'jose';

const PORTAL_JWT_ISSUER = 'desmulta-portal';
const PORTAL_JWT_AUDIENCE = 'cliente';
const PORTAL_SESSION_TTL_SECONDS = 4 * 60 * 60; // 4 horas

function getPortalJwtSecret(): Uint8Array {
  const secret = process.env.CLIENT_PORTAL_JWT_SECRET;
  if (!secret) {
    throw new Error(
      '🛡️ [DevSecOps] CLIENT_PORTAL_JWT_SECRET no configurada. Imposible emitir sesión segura.'
    );
  }
  return new TextEncoder().encode(secret);
}

/**
 * Firma un JWT de sesión para el portal del cliente.
 * El `sub` es el trackingUuid del expediente — nunca contiene PII.
 *
 * @param trackingUuid UUID del expediente (ya es Zero-PII)
 * @returns Token JWT firmado con HS256, expira en 4 horas
 */
export async function signPortalSession(trackingUuid: string): Promise<string> {
  const secret = getPortalJwtSecret();
  return new SignJWT({ sub: trackingUuid })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(PORTAL_JWT_ISSUER)
    .setAudience(PORTAL_JWT_AUDIENCE)
    .setExpirationTime(`${PORTAL_SESSION_TTL_SECONDS}s`)
    .sign(secret);
}

/**
 * Verifica un JWT de sesión del portal del cliente.
 *
 * @param token JWT recibido de la cookie `_portal_session`
 * @returns El `trackingUuid` si el token es válido, `null` si no lo es
 */
export async function verifyPortalSession(token: string): Promise<string | null> {
  try {
    const secret = getPortalJwtSecret();
    const { payload } = await jwtVerify(token, secret, {
      issuer: PORTAL_JWT_ISSUER,
      audience: PORTAL_JWT_AUDIENCE,
    });
    return (payload.sub as string) ?? null;
  } catch {
    return null;
  }
}
