import { SignJWT, jwtVerify } from 'jose';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export function getVipSecret(): Uint8Array {
  if (!process.env.VIP_JWT_SECRET) {
    throw new Error('FATAL ERROR: VIP_JWT_SECRET is not set in environment variables.');
  }
  return new TextEncoder().encode(process.env.VIP_JWT_SECRET);
}

export async function signVipSession(payload: {
  hashedCedula: string;
  hashedCelular: string;
}): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 60 * 60 * 48; // 48h en lugar de 7 días
  const jti = crypto.randomUUID();  // ID único del token

  return new SignJWT({ ...payload, jti })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setExpirationTime(exp)
    .setIssuedAt(iat)
    .setNotBefore(iat)
    .sign(getVipSecret());
}

export async function verifyVipSession(
  token: string
): Promise<{ hashedCedula: string; hashedCelular: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getVipSecret());
    // Verificar lista negra de tokens revocados
    if (payload.jti) {
      const revoked = await redis.exists(`vip:revoked:${payload.jti}`);
      if (revoked) return null;
    }
    if (!payload.hashedCedula || !payload.hashedCelular) return null;
    return {
      hashedCedula: payload.hashedCedula as string,
      hashedCelular: payload.hashedCelular as string,
    };
  } catch {
    return null;
  }
}

// En logout — añadir JTI a la lista negra:
export async function revokeVipSession(jti: string): Promise<void> {
  await redis.set(`vip:revoked:${jti}`, '1', { ex: 48 * 3600 });
}
