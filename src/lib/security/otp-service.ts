import { Redis } from '@upstash/redis';
import { timingSafeEqual } from 'crypto';

const redis = Redis.fromEnv();

export function generateOtp(): string {
  // Genera un código de 6 dígitos
  const val = Math.floor(100000 + Math.random() * 900000);
  return val.toString();
}

export async function storeOtpChallenge(hashedCedula: string, otp: string): Promise<void> {
  const key = `vip-otp:${hashedCedula}`;
  // Expira en 5 minutos
  await redis.setex(key, 300, otp);
}

export async function verifyOtpChallenge(hashedCedula: string, providedOtp: string): Promise<boolean> {
  const key = `vip-otp:${hashedCedula}`;
  const storedOtp = await redis.get<string>(key);
  
  if (!storedOtp) return false;
  
  // timingSafeEqual para evitar ataques de timing side-channel
  const storedBuf = Buffer.from(String(storedOtp));
  const providedBuf = Buffer.from(String(providedOtp));
  
  if (storedBuf.length !== providedBuf.length) return false;
  
  const isValid = timingSafeEqual(storedBuf, providedBuf);
  
  if (isValid) {
    await redis.del(key); // OTP de un solo uso
  }
  
  return isValid;
}
