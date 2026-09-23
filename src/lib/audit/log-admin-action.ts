// ─────────────────────────────────────────────────────────────────────────────
// src/lib/audit/log-admin-action.ts — [2026-09-22] Auditoría
//
// Movido desde app/admin/audit-actions.ts ('use server'). Toda función exportada
// de un archivo 'use server' es un endpoint público invocable por POST: dejar
// logAdminAction ahí permitía (si llegaba al bundle cliente) inyectar registros
// falsos en la bitácora forense. Aquí es un módulo solo-servidor.
// ─────────────────────────────────────────────────────────────────────────────
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { headers } from 'next/headers';
import { logger } from '@/lib/logger/security-logger';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'EXPORT'
  | 'ACCESS'
  | 'GRANT_ADMIN'
  | 'REVOKE_ADMIN'
  | 'OTHER';

export async function logAdminAction(payload: {
  adminEmail: string;
  action: AuditAction;
  resource: string;
  details: Record<string, unknown>;
}) {
  try {
    let ip = 'unknown';
    try {
      const headersList = await headers();
      const { getSecureIp } = await import('@/lib/security/ip-utils');
      ip = getSecureIp(headersList);
    } catch {
      ip = 'background-task/test';
    }

    getAdminApp();
    const db = getFirestore();

    const now = new Date();
    const expireDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await db.collection('audit_logs').add({
      adminEmail: payload.adminEmail,
      action: payload.action,
      resource: payload.resource,
      details: payload.details,
      ipAddress: ip,
      timestamp: Timestamp.fromDate(now),
      expireAt: Timestamp.fromDate(expireDate), // TTL de Firestore
    });

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
