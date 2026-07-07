import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';
import { createHash, timingSafeEqual } from 'crypto';

const OTP_EXPIRY_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 5;

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashOtp(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

export async function storeOtpChallenge(
  hashedCedula: string,
  otpCode: string,
  hashedCelular: string
): Promise<void> {
  getAdminApp();
  const db = getFirestore();
  const codeHash = hashOtp(otpCode);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await db
    .collection('vip_otps')
    .doc(hashedCedula)
    .set({
      codeHash,
      hashedCelular,
      createdAt: Timestamp.fromDate(now),
      expiresAt: Timestamp.fromDate(expiresAt),
      attempts: 0,
    });
}

export async function verifyOtpChallenge(
  hashedCedula: string,
  code: string
): Promise<{ success: boolean; hashedCelular?: string }> {
  if (!code || !/^\d{6}$/.test(code)) return { success: false };

  getAdminApp();
  const db = getFirestore();
  const otpDocRef = db.collection('vip_otps').doc(hashedCedula);
  const otpDoc = await otpDocRef.get();

  if (!otpDoc.exists) return { success: false };

  const otpData = otpDoc.data()!;
  const now = Timestamp.now();

  if (now.toMillis() > otpData.expiresAt.toMillis()) {
    await otpDocRef.delete();
    return { success: false };
  }

  if (otpData.attempts >= MAX_OTP_ATTEMPTS) {
    await otpDocRef.delete();
    return { success: false };
  }

  const inputBuffer = Buffer.from(hashOtp(code));
  const expectedBuffer = Buffer.from(otpData.codeHash);
  const isMatch =
    inputBuffer.length === expectedBuffer.length && timingSafeEqual(inputBuffer, expectedBuffer);

  if (!isMatch) {
    await otpDocRef.update({ attempts: otpData.attempts + 1 });
    return { success: false };
  }

  await otpDocRef.delete();
  return { success: true, hashedCelular: otpData.hashedCelular };
}
