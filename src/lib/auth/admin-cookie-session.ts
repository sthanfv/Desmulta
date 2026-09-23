// ─────────────────────────────────────────────────────────────────────────────
// src/lib/auth/admin-cookie-session.ts — [2026-09-22] Auditoría
//
// Resuelve la identidad del admin SOLO desde cookies HttpOnly (sin idToken):
//   __session (next-firebase-auth-edge) + admins/{uid} activo + admin-2fa-token
//   con aud 'admin-2fa' y el MISMO uid.
// Para Server Actions que antes no validaban nada (logExportAction, verifyGodMode,
// verifyOperatorPin, logRevealAuditAction, logExportPdfAction).
// ─────────────────────────────────────────────────────────────────────────────
import { cookies } from 'next/headers';
import { getTokens } from 'next-firebase-auth-edge/lib/next/tokens';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';
import { verifyAdminToken } from '@/lib/auth/admin-jwt';

export interface CookieAdmin {
  uid: string;
  email: string;
}

export async function getAdminFromCookies(): Promise<CookieAdmin | null> {
  try {
    const cookieStore = await cookies();
    const tokens = await getTokens(cookieStore, {
      cookieName: '__session',
      cookieSignatureKeys: [
        process.env.AUTH_COOKIE_SIGNATURE_KEY_CURRENT || '',
        process.env.AUTH_COOKIE_SIGNATURE_KEY_PREVIOUS || '',
      ],
      serviceAccount: {
        projectId:
          process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      },
      apiKey:
        process.env.NEXT_PUBLIC_BASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    });
    if (!tokens) return null;

    const uid = tokens.decodedToken.uid;
    const twoFa = await verifyAdminToken(cookieStore.get('admin-2fa-token')?.value, 'admin-2fa');
    if (!twoFa || twoFa.uid !== uid) return null;

    getAdminApp();
    const adminDoc = await getFirestore().collection('admins').doc(uid).get();
    if (!adminDoc.exists || adminDoc.data()?.disabled === true) return null;

    return { uid, email: tokens.decodedToken.email || 'admin_sin_correo' };
  } catch {
    return null;
  }
}

/** Exige un PIN operacional verificado en los últimos 5 min por ESTE admin. */
export async function hasFreshOperatorPin(uid: string): Promise<boolean> {
  const cookieStore = await cookies();
  const payload = await verifyAdminToken(
    cookieStore.get('operator-pin-token')?.value,
    'operator-pin'
  );
  return !!payload && payload.uid === uid;
}
