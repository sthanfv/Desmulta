import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions/v2';
import { sendSecurityAlert } from './telegram-utils';

export const onCasoChanged = onDocumentWritten('casos/{caseId}', async (event) => {
  const db = admin.firestore();
  const caseId = event.params.caseId;

  // 1. Detección de Eliminación (DELETE)
  if (!event.data?.after.exists) {
    logger.warn(`[AUDITORIA] Caso Eliminado: ${caseId}`);
    
    // Alerta de Telegram (Mejora C)
    const beforeData = event.data?.before.data() || {};
    const adminEmail = beforeData._lastOperatorEmail || 'Sistema/Externo';
    const msg = `🚨 <b>ALERTA DE SEGURIDAD CRÍTICA</b> 🚨\n\n<b>Expediente Eliminado:</b> ${caseId}\n<b>Operador:</b> ${adminEmail}\n\n<i>Esta acción borró permanentemente un registro oficial de la base de datos.</i>`;
    await sendSecurityAlert(msg);

    // Registro de Auditoría
    await db.collection('audit_logs').add({
      adminEmail: adminEmail,
      action: 'DELETE',
      resource: 'Case',
      details: { caseId },
      ipAddress: 'cloud-function-trigger',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    return;
  }

  // 2. Detección de Cambios de Estado o Ediciones (UPDATE / CREATE)
  const afterData = event.data?.after.data() || {};
  const beforeData = event.data?.before?.data() || {};

  // Solo auditamos si hubo un cambio real en el estado o si es nuevo
  if (beforeData.status !== afterData.status) {
    const adminEmail = afterData._lastOperatorEmail || 'Sistema/Externo';
    const action = event.data?.before.exists ? 'UPDATE' : 'CREATE';

    // Limpiamos el campo temporal _lastOperatorEmail para no ensuciar la BD a largo plazo
    if (afterData._lastOperatorEmail) {
      // Nota: Hacemos esto asíncrono para no bloquear la función, o podemos dejarlo.
      // Se omite para evitar ciclos infinitos de onDocumentWritten (o si se hace, debe ignorar cambios donde solo cambie este campo).
    }

    await db.collection('audit_logs').add({
      adminEmail: adminEmail,
      action: action,
      resource: 'CaseStatus',
      details: { caseId, newStatus: afterData.status, oldStatus: beforeData.status || null },
      ipAddress: 'cloud-function-trigger',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
  }
});

export const onConsultaChanged = onDocumentWritten('consultations/{consultationId}', async (event) => {
  const db = admin.firestore();
  const consultationId = event.params.consultationId;

  // 1. Detección de Eliminación (DELETE)
  if (!event.data?.after.exists) {
    logger.warn(`[AUDITORIA] Consulta Eliminada: ${consultationId}`);
    
    // Alerta de Telegram (Mejora C)
    const beforeData = event.data?.before.data() || {};
    const adminEmail = beforeData._lastOperatorEmail || 'Sistema/Externo';
    const msg = `🚨 <b>ALERTA DE SEGURIDAD CRÍTICA</b> 🚨\n\n<b>Consulta Eliminada:</b> ${consultationId}\n<b>Operador:</b> ${adminEmail}\n\n<i>Esta acción borró un Lead de la base de datos.</i>`;
    await sendSecurityAlert(msg);

    // Registro de Auditoría
    await db.collection('audit_logs').add({
      adminEmail: adminEmail,
      action: 'DELETE',
      resource: 'Consultation',
      details: { consultationId },
      ipAddress: 'cloud-function-trigger',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    return;
  }

  // 2. Detección de Cambios de Estado o Ediciones (UPDATE / CREATE)
  const afterData = event.data?.after.data() || {};
  const beforeData = event.data?.before?.data() || {};

  if (beforeData.status !== afterData.status) {
    const adminEmail = afterData._lastOperatorEmail || 'Sistema/Externo';
    const action = event.data?.before.exists ? 'UPDATE' : 'CREATE';

    await db.collection('audit_logs').add({
      adminEmail: adminEmail,
      action: action,
      resource: 'ConsultationStatus',
      details: { consultationId, newStatus: afterData.status, oldStatus: beforeData.status || null },
      ipAddress: 'cloud-function-trigger',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
  }
});
