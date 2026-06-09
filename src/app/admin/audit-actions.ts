'use server';

import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { logger } from '@/lib/logger/security-logger';
import { headers, cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { timingSafeEqual } from 'crypto';
import { rateLimit } from '@/lib/security/rate-limit';
import { getTokens } from 'next-firebase-auth-edge/lib/next/tokens';

export interface AdminUser {
  uid: string;
  email: string;
  isAdmin: boolean;
  createdAt?: string;
  lastSignInTime?: string;
}

export interface AuditLog {
  id?: string;
  adminEmail: string;
  action:
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'EXPORT'
    | 'ACCESS'
    | 'GRANT_ADMIN'
    | 'REVOKE_ADMIN'
    | 'OTHER';
  resource: string;
  details: Record<string, unknown>;
  ipAddress: string;
  timestamp: Date | Timestamp;
}

export async function logAdminAction(payload: {
  adminEmail: string;
  action: AuditLog['action'];
  resource: string;
  details: Record<string, unknown>;
}) {
  try {
    let ip = 'unknown';
    try {
      const headersList = await headers();
      ip =
        headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        headersList.get('x-real-ip') ||
        'unknown';
    } catch {
      ip = 'background-task/test';
    }

    getAdminApp();
    const db = getFirestore();

    const now = new Date();
    const retentionDays = 30;
    const expireDate = new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000);

    const logEntry = {
      adminEmail: payload.adminEmail,
      action: payload.action,
      resource: payload.resource,
      details: payload.details,
      ipAddress: ip,
      timestamp: Timestamp.fromDate(now),
      expireAt: Timestamp.fromDate(expireDate), // Campo clave para el TTL gratuito de Firebase
    };

    await db.collection('audit_logs').add(logEntry);

    logger.security(
      `[AuditLog] ${payload.action} on ${payload.resource} by ${payload.adminEmail}`,
      { ip }
    );

    return { success: true };
  } catch (error) {
    logger.error('Error al registrar auditoria general', { error: String(error) });
    return { success: false };
  }
}

export async function logExportAction(payload: {
  user: string;
  type: 'excel' | 'pdf';
  count: number;
}) {
  // Enviar alerta a Telegram
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_SECURITY_CHAT_ID;
  if (token && chatId) {
    try {
      const typeStr = payload.type === 'excel' ? 'Excel' : 'PDF';
      const msg = `🚨 <b>ALERTA DE SEGURIDAD</b> 🚨\n\n<b>Operador:</b> ${payload.user}\n<b>Acción:</b> Exportación masiva de Base de Datos\n<b>Formato:</b> ${typeStr}\n<b>Registros:</b> ${payload.count}\n\n<i>Esto fue generado desde el panel de administrador.</i>`;

      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML' }),
      });
    } catch (err) {
      logger.error('Error enviando alerta de Telegram', { error: String(err) });
    }
  }

  return logAdminAction({
    adminEmail: payload.user,
    action: 'EXPORT',
    resource: payload.type === 'excel' ? 'ExportExcel' : 'ExportPDF',
    details: { count: payload.count },
  });
}

// ============================================================================
// GOD MODE - Lectura y Seguridad
// ============================================================================

export async function verifyGodMode(password: string) {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = await rateLimit(`god-mode-auth:${ip}`, 3, 30 * 60 * 1000);
  if (!rl.success) {
    logger.security('[GodMode] Bloqueado por rate limit', { ip });
    return { success: false, error: 'Demasiados intentos. Espera 30 minutos.' };
  }

  const expectedPassword = process.env.SUPERADMIN_AUDIT_PASSWORD;
  if (!expectedPassword) {
    logger.error('CRITICAL: SUPERADMIN_AUDIT_PASSWORD no configurada.');
    return { success: false, error: 'Configuración de seguridad ausente' };
  }

  const bufPassword = Buffer.from(password);
  const bufExpected = Buffer.from(expectedPassword);
  if (bufPassword.length !== bufExpected.length || !timingSafeEqual(bufPassword, bufExpected)) {
    logger.security('Intento fallido de acceso a God Mode', { password_length: password.length });
    return { success: false, error: 'Acceso denegado' };
  }

  // Generamos un token temporal de 30 minutos
  const jwtSecret = process.env.GOD_MODE_JWT_SECRET;
  if (!jwtSecret) {
    logger.error('CRITICAL: GOD_MODE_JWT_SECRET no configurada.');
    return { success: false, error: 'Configuración de seguridad ausente' };
  }
  const secret = new TextEncoder().encode(jwtSecret);
  const token = await new SignJWT({ role: 'superadmin', auth: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30m')
    .sign(secret);

  // Guardamos en cookie HttpOnly
  const cookieStore = await cookies();
  cookieStore.set('admin-god-mode-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/admin',
    maxAge: 30 * 60, // 30 minutos
  });

  logger.security('Acceso exitoso a God Mode');
  return { success: true };
}

export async function checkGodModeSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin-god-mode-token');
  if (!token) return false;

  try {
    const jwtSecret = process.env.GOD_MODE_JWT_SECRET;
    if (!jwtSecret) {
      logger.error('CRITICAL: GOD_MODE_JWT_SECRET no configurada');
      return false;
    }
    const secret = new TextEncoder().encode(jwtSecret);
    await jwtVerify(token.value, secret);
    return true;
  } catch {
    return false;
  }
}

export async function exitGodMode() {
  const cookieStore = await cookies();
  cookieStore.delete('admin-god-mode-token');
  return { success: true };
}

export async function fetchAuditLogs(options: {
  limit?: number;
  cursor?: string;
  adminEmail?: string;
}) {
  const isGodMode = await checkGodModeSession();
  if (!isGodMode) {
    return { success: false, error: 'Sesión no autorizada', logs: [] };
  }

  try {
    getAdminApp();
    const db = getFirestore();
    let query: FirebaseFirestore.Query = db.collection('audit_logs').orderBy('timestamp', 'desc');

    if (options.adminEmail) {
      query = query.where('adminEmail', '==', options.adminEmail);
    }

    // Limit and pagination
    const fetchLimit = options.limit || 50;
    query = query.limit(fetchLimit);

    if (options.cursor) {
      const cursorDoc = await db.collection('audit_logs').doc(options.cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.get();
    const logs = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate().toISOString() || new Date().toISOString(),
        expireAt: data.expireAt?.toDate().toISOString() || null,
      };
    });

    const lastCursor =
      snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1].id : undefined;

    return { success: true, logs, nextCursor: lastCursor };
  } catch (error) {
    logger.error('Error fetching audit logs', { error: String(error) });
    return { success: false, error: 'Error del servidor', logs: [] };
  }
}

export async function exportAuditLogs(filters: {
  adminEmail?: string;
  startDate?: string; // Formato YYYY-MM-DD
  endDate?: string; // Formato YYYY-MM-DD
  cursor?: string;
  limit?: number;
}) {
  const isGodMode = await checkGodModeSession();
  if (!isGodMode) throw new Error('No autorizado');

  getAdminApp();
  const db = getFirestore();
  let query: FirebaseFirestore.Query = db.collection('audit_logs').orderBy('timestamp', 'desc');

  if (filters.adminEmail && filters.adminEmail !== 'ALL') {
    query = query.where('adminEmail', '==', filters.adminEmail);
  }

  if (filters.startDate) {
    const start = new Date(`${filters.startDate}T00:00:00Z`);
    query = query.where('timestamp', '>=', start);
  }

  if (filters.endDate) {
    const end = new Date(`${filters.endDate}T23:59:59Z`);
    query = query.where('timestamp', '<=', end);
  }

  // Límite por defecto para evitar timeouts y agotar memoria
  const fetchLimit = filters.limit || 200;
  query = query.limit(fetchLimit);

  if (filters.cursor) {
    const cursorDoc = await db.collection('audit_logs').doc(filters.cursor).get();
    if (cursorDoc.exists) {
      query = query.startAfter(cursorDoc);
    }
  }

  const snapshot = await query.get();

  const logs = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      fecha: data.timestamp?.toDate().toISOString() || '',
      administrador: data.adminEmail,
      accion: data.action,
      recurso: data.resource,
      detalles: JSON.stringify(data.details),
      ip: data.ipAddress,
    };
  });

  const lastCursor =
    snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1].id : undefined;

  return { logs, nextCursor: lastCursor };
}

// ----------------------------------------------------------------------
// User Management Actions (God Mode Only)
// ----------------------------------------------------------------------

export async function listAdminUsers() {
  const isGodMode = await checkGodModeSession();
  if (!isGodMode) return { success: false, error: 'No autorizado' };

  try {
    getAdminApp();
    const auth = getAuth();

    let allAdmins: AdminUser[] = [];
    let pageToken: string | undefined = undefined;

    do {
      const listUsersResult = await auth.listUsers(1000, pageToken);
      const adminsInPage = listUsersResult.users
        .filter((u) => u.customClaims?.admin === true)
        .map((userRecord) => ({
          uid: userRecord.uid,
          email: userRecord.email || 'Sin correo',
          isAdmin: true,
          createdAt: userRecord.metadata.creationTime,
          lastSignInTime: userRecord.metadata.lastSignInTime,
        }));

      allAdmins = [...allAdmins, ...adminsInPage];
      pageToken = listUsersResult.pageToken;
    } while (pageToken);

    allAdmins.sort((a, b) => a.email.localeCompare(b.email));

    return { success: true, users: allAdmins };
  } catch (error: unknown) {
    logger.error('Error listAdminUsers', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, error: 'Error obteniendo administradores' };
  }
}

export async function grantAdminAccessByEmail(targetEmail: string) {
  const isGodMode = await checkGodModeSession();
  if (!isGodMode) return { success: false, error: 'No autorizado' };

  try {
    getAdminApp();
    const auth = getAuth();

    let user;
    try {
      user = await auth.getUserByEmail(targetEmail);
    } catch (e: unknown) {
      if (e instanceof Error && (e as Error & { code?: string }).code === 'auth/user-not-found') {
        return { success: false, error: 'No existe una cuenta de Firebase Auth con este correo.' };
      }
      throw e;
    }

    const currentClaims = user.customClaims || {};
    await auth.setCustomUserClaims(user.uid, { ...currentClaims, admin: true });

    await logAdminAction({
      adminEmail: 'SUPER_ADMIN_GOD_MODE',
      action: 'GRANT_ADMIN',
      resource: `users/${user.uid}`,
      details: { targetEmail },
    });

    return { success: true };
  } catch (error: unknown) {
    logger.error('Error grantAdminAccessByEmail', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, error: 'Error al otorgar permisos' };
  }
}

export async function revokeAdminAccess(uid: string, targetEmail: string) {
  const isGodMode = await checkGodModeSession();
  if (!isGodMode) return { success: false, error: 'No autorizado' };

  try {
    getAdminApp();
    const auth = getAuth();
    const user = await auth.getUser(uid);
    const currentClaims = user.customClaims || {};
    await auth.setCustomUserClaims(uid, { ...currentClaims, admin: false });

    await logAdminAction({
      adminEmail: 'SUPER_ADMIN_GOD_MODE',
      action: 'REVOKE_ADMIN',
      resource: `users/${uid}`,
      details: { targetEmail },
    });

    return { success: true };
  } catch (error: unknown) {
    logger.error('Error revokeAdminAccess', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, error: 'Error al revocar permisos' };
  }
}

// ----------------------------------------------------------------------
// Operaciones Críticas (Hardening V1.1.0)
// ----------------------------------------------------------------------

export async function verifyOperatorPin(pin: string) {
  const expectedPin = process.env.OPERATOR_PIN;
  if (!expectedPin) {
    logger.error('CRITICAL: OPERATOR_PIN no configurada.');
    return { success: false, error: 'Configuración de seguridad ausente' };
  }

  // ── Rate limit: máximo 5 intentos por IP en 15 minutos ──────────────────
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = await rateLimit(`operator-pin:${ip}`, 5, 15 * 60 * 1000);
  if (!rl.success) {
    logger.security('Rate limit PIN operacional alcanzado', { ip });
    return { success: false, error: 'Demasiados intentos. Espera 15 minutos.' };
  }

  const bufPin = Buffer.from(pin);
  const bufExpected = Buffer.from(expectedPin);

  if (bufPin.length !== bufExpected.length || !timingSafeEqual(bufPin, bufExpected)) {
    logger.security('Intento fallido de PIN operacional', { ip });
    return { success: false, error: 'PIN incorrecto' };
  }

  return { success: true };
}

async function getAdminEmailFromSession(): Promise<string> {
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
    apiKey: process.env.NEXT_PUBLIC_BASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  });

  return tokens?.decodedToken?.email || 'admin_desconocido@desmulta.com';
}

export async function logRevealAuditAction(expedienteId: string) {
  try {
    const adminEmail = await getAdminEmailFromSession();

    await logAdminAction({
      adminEmail,
      action: 'ACCESS',
      resource: `expediente/${expedienteId}`,
      details: {
        reason: 'Revelado de datos sensibles en UI (Zero-PII unmasking)',
      },
    });

    return { success: true };
  } catch (error) {
    logger.error('Error al registrar auditoría de revelación', { error: String(error) });
    return { success: false, error: 'Error de auditoría' };
  }
}

export async function logExportPdfAction(filtrosStr: string) {
  try {
    const adminEmail = await getAdminEmailFromSession();

    await logAdminAction({
      adminEmail,
      action: 'EXPORT',
      resource: 'expedientes/pdf',
      details: {
        filtros: filtrosStr,
        reason: 'Exportación masiva de datos (Server-Side WeasyPrint)',
      },
    });

    return { success: true };
  } catch (error) {
    logger.error('Error al registrar auditoría de exportación PDF', { error: String(error) });
    return { success: false, error: 'Error de auditoría' };
  }
}
