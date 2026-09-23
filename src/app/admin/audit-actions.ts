'use server';

import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { syncOperatorRoster } from '@/lib/sync-operator-roster';
import { logger } from '@/lib/logger/security-logger';
import { headers, cookies } from 'next/headers';
import { timingSafeEqual } from 'crypto';
import { rateLimit } from '@/lib/security/rate-limit';
// [2026-09-22] FIX: tokens con audiencia + identidad admin desde cookies + logger fuera de 'use server'
import { signAdminToken, verifyAdminToken } from '@/lib/auth/admin-jwt';
import { getAdminFromCookies } from '@/lib/auth/admin-cookie-session';
import { logAdminAction } from '@/lib/audit/log-admin-action';

const escapeHtml = (v: unknown) =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
  );

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

// logAdminAction vive ahora en '@/lib/audit/log-admin-action' (NO es Server Action).

export async function logExportAction(payload: {
  user: string;
  type: 'excel' | 'pdf';
  count: number;
}) {
  // [2026-09-22] FIX: antes era invocable sin sesión (Server Action pública) y metía
  // `payload.user` sin escapar en un mensaje HTML de Telegram.
  const admin = await getAdminFromCookies();
  if (!admin) return { success: false };
  const count = Number.isFinite(payload.count) ? Math.max(0, Math.floor(payload.count)) : 0;

  // Enviar alerta a Telegram
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_SECURITY_CHAT_ID;
  if (token && chatId) {
    try {
      const typeStr = payload.type === 'excel' ? 'Excel' : 'PDF';
      const msg = `🚨 <b>ALERTA DE SEGURIDAD</b> 🚨\n\n<b>Operador:</b> ${escapeHtml(admin.email)}\n<b>Acción:</b> Exportación masiva de Base de Datos\n<b>Formato:</b> ${typeStr}\n<b>Registros:</b> ${count}\n\n<i>Esto fue generado desde el panel de administrador.</i>`;

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
    adminEmail: admin.email,
    action: 'EXPORT',
    resource: payload.type === 'excel' ? 'ExportExcel' : 'ExportPDF',
    details: { count },
  });
}

// ============================================================================
// GOD MODE - Lectura y Seguridad
// ============================================================================

export async function verifyGodMode(password: string) {
  // [2026-09-22] FIX: God Mode exige además una sesión admin 2FA válida.
  const admin = await getAdminFromCookies();
  if (!admin) return { success: false, error: 'Acceso denegado' };

  const headersList = await headers();
  const { getSecureIp } = await import('@/lib/security/ip-utils');
  const ip = getSecureIp(headersList);

  // 🛡️ TESTING BYPASS: Evitar bloqueos de Rate Limit en tests E2E
  const isE2E = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';
  let rl = { success: true };

  if (!isE2E) {
    rl = await rateLimit(`god-mode-auth:${ip}`, 3, 30 * 60 * 1000);
  }

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
    logger.security('Intento fallido de acceso a God Mode', { uid: admin.uid });
    return { success: false, error: 'Acceso denegado' };
  }

  // Token temporal de 30 minutos con audiencia 'god-mode' ligado al uid del admin
  const token = await signAdminToken('god-mode', { uid: admin.uid, role: 'superadmin' }, '30m');

  // Guardamos en cookie HttpOnly
  const cookieStore = await cookies();
  cookieStore.set('admin-god-mode-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 30 * 60, // 30 minutos
  });

  logger.security('Acceso exitoso a God Mode');
  return { success: true };
}

export async function checkGodModeSession() {
  // [2026-09-22] FIX: antes aceptaba CUALQUIER JWT del mismo secreto (p. ej. el
  // admin-2fa-token de cualquier operador) → escalada a superadmin.
  const cookieStore = await cookies();
  const payload = await verifyAdminToken(
    cookieStore.get('admin-god-mode-token')?.value,
    'god-mode'
  );
  if (!payload) return false;
  const admin = await getAdminFromCookies();
  return !!admin && payload.uid === admin.uid;
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

    // CAPA 1: Actualizar Custom Claims en Firebase Auth
    const currentClaims = user.customClaims || {};
    await auth.setCustomUserClaims(user.uid, { ...currentClaims, admin: true });

    // CAPA 2: Sincronizar con la colección 'admins' de Firestore.
    // requireAdminSession verifica AMBAS capas. Sin este documento el acceso
    // al panel es bloqueado aunque el Custom Claim esté activo.
    const db = getFirestore();
    const adminRef = db.collection('admins').doc(user.uid);
    const adminDoc = await adminRef.get();
    if (!adminDoc.exists) {
      await adminRef.set({
        email: user.email ?? targetEmail,
        uid: user.uid,
        grantedAt: Timestamp.now(),
        disabled: false,
      });
    } else {
      // Si ya existe pero estaba deshabilitado, reactivar
      await adminRef.update({ disabled: false, reactivatedAt: Timestamp.now() });
    }

    await logAdminAction({
      adminEmail: 'SUPER_ADMIN_GOD_MODE',
      action: 'GRANT_ADMIN',
      resource: `users/${user.uid}`,
      details: { targetEmail },
    });

    // 🔄 Sincronizar roster de operadores tras agregar nuevo admin
    await syncOperatorRoster();

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

    // CAPA 1: Revocar Custom Claims en Firebase Auth
    await auth.setCustomUserClaims(uid, { ...currentClaims, admin: false });

    // CAPA 2: Marcar cuenta como deshabilitada en Firestore.
    // requireAdminSession verifica adminData?.disabled === true para bloquear acceso.
    const db = getFirestore();
    const adminRef = db.collection('admins').doc(uid);
    const adminDoc = await adminRef.get();
    if (adminDoc.exists) {
      await adminRef.update({ disabled: true, revokedAt: Timestamp.now() });
    }

    await logAdminAction({
      adminEmail: 'SUPER_ADMIN_GOD_MODE',
      action: 'REVOKE_ADMIN',
      resource: `users/${uid}`,
      details: { targetEmail },
    });

    // 🔄 Sincronizar roster de operadores tras revocar admin
    await syncOperatorRoster();

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
  // [2026-09-22] FIX: exige sesión admin y emite una prueba server-side (5 min) que
  // las acciones destructivas verifican. Antes el PIN solo bloqueaba la UI.
  const admin = await getAdminFromCookies();
  if (!admin) return { success: false, error: 'Acceso denegado' };

  const expectedPin = process.env.OPERATOR_PIN;
  if (!expectedPin) {
    logger.error('CRITICAL: OPERATOR_PIN no configurada.');
    return { success: false, error: 'Configuración de seguridad ausente' };
  }

  // ── Rate limit: máximo 5 intentos por IP en 15 minutos ──────────────────
  const headersList = await headers();
  const { getSecureIp } = await import('@/lib/security/ip-utils');
  const ip = getSecureIp(headersList);
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

  const pinToken = await signAdminToken('operator-pin', { uid: admin.uid }, '5m');
  const cookieStore = await cookies();
  cookieStore.set('operator-pin-token', pinToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 5 * 60,
  });

  return { success: true };
}

export async function logRevealAuditAction(expedienteId: string) {
  try {
    const admin = await getAdminFromCookies();
    if (!admin) return { success: false, error: 'Acceso denegado' };
    const adminEmail = admin.email;

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
    const admin = await getAdminFromCookies();
    if (!admin) return { success: false, error: 'Acceso denegado' };
    const adminEmail = admin.email;

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
