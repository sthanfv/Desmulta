import { SignJWT, jwtVerify } from 'jose';

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
  const exp = iat + 60 * 60 * 24 * 7; // 7 días de sesión activa

  return new SignJWT({ ...payload })
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
    if (!payload.hashedCedula || !payload.hashedCelular) return null;
    return {
      hashedCedula: payload.hashedCedula as string,
      hashedCelular: payload.hashedCelular as string,
    };
  } catch {
    return null;
  }
}
