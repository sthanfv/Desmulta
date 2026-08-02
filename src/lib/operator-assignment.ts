import { Firestore, Transaction, FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger/security-logger';

/**
 * Resultado de la asignación de operador para una consulta o lead.
 */
export interface OperatorAssignment {
  /** UID del operador asignado. null si no hay operadores activos. */
  assignedTo: string | null;
  /** Email del operador asignado para visualización en el Kanban. */
  assignedToEmail: string | null;
}

/**
 * Obtiene el siguiente operador disponible mediante Round-Robin atómico.
 *
 * DEBE ejecutarse dentro de una transacción de Firestore para garantizar
 * que dos consultas simultáneas no se asignen al mismo operador.
 *
 * Comportamiento adaptativo:
 * - 0 operadores activos → retorna null (sin asignar).
 * - 1 operador activo → retorna siempre ese UID (sin incrementar índice).
 * - 2+ operadores activos → retorna activeOperators[nextIndex] e incrementa.
 *
 * @param transaction - Transacción activa de Firestore.
 * @param db - Instancia de Firestore.
 * @returns OperatorAssignment con el UID y email del operador asignado.
 */
export async function getNextOperator(
  transaction: Transaction,
  db: Firestore
): Promise<OperatorAssignment> {
  const rosterRef = db.collection('metadata').doc('operator_roster');
  const rosterDoc = await transaction.get(rosterRef);

  // Si no existe el roster o no hay operadores, no asignar
  if (!rosterDoc.exists) {
    logger.warn('[round-robin] No existe el documento operator_roster. Sin asignación.');
    return { assignedTo: null, assignedToEmail: null };
  }

  const data = rosterDoc.data();
  const activeOperators: string[] = data?.activeOperators || [];
  const operatorEmails: Record<string, string> = data?.operatorEmails || {};

  if (activeOperators.length === 0) {
    logger.warn('[round-robin] No hay operadores activos. Sin asignación.');
    return { assignedTo: null, assignedToEmail: null };
  }

  // Caso trivial: solo 1 operador → todo le llega a él sin tocar el índice
  if (activeOperators.length === 1) {
    const uid = activeOperators[0];
    return {
      assignedTo: uid,
      assignedToEmail: operatorEmails[uid] || null,
    };
  }

  // Round-Robin: leer índice actual, asignar, incrementar atómicamente
  const currentIndex = (data?.nextIndex ?? 0) % activeOperators.length;
  const assignedUid = activeOperators[currentIndex];
  const nextIndex = (currentIndex + 1) % activeOperators.length;

  // Actualizar el índice dentro de la transacción (atómico)
  transaction.update(rosterRef, {
    nextIndex,
    lastAssignment: FieldValue.serverTimestamp(),
  });

  logger.info(
    `[round-robin] Asignado a ${operatorEmails[assignedUid] || assignedUid} (índice ${currentIndex} → ${nextIndex})`
  );

  return {
    assignedTo: assignedUid,
    assignedToEmail: operatorEmails[assignedUid] || null,
  };
}

/**
 * 🛡️ AUDITORÍA 2026-08-01: Reasignación de huérfanos (T-NX-06)
 * Reasigna los leads/consultas de un operador que fue eliminado del roster.
 * 
 * @param db - Instancia de Firestore
 * @param removedUid - UID del operador eliminado
 * @param fallbackUid - UID del operador al que se le asignarán los casos (Admin u otro)
 */
export async function reassignOrphanedLeads(
  db: Firestore,
  removedUid: string,
  fallbackUid: string
): Promise<void> {
  const collectionsToUpdate = ['consultations', 'leads'];
  
  for (const coll of collectionsToUpdate) {
    const snapshot = await db.collection(coll)
      .where('assignedTo', '==', removedUid)
      .where('status', 'in', ['PENDING', 'IN_PROGRESS', 'URGENT'])
      .get();
      
    if (snapshot.empty) continue;

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { 
        assignedTo: fallbackUid,
        updatedAt: FieldValue.serverTimestamp()
      });
    });
    
    await batch.commit();
    logger.info(`[reassignment] Reasignados ${snapshot.size} documentos en ${coll} de ${removedUid} a ${fallbackUid}`);
  }
}
