'use server';

import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';
import { logger } from '@/lib/logger/security-logger';

/**
 * Sincroniza el roster de operadores activos en `metadata/operator_roster`.
 *
 * Lee la colección `admins` de Firestore, filtra los que NO están deshabilitados,
 * y actualiza el documento central que el Round-Robin consume transaccionalmente.
 *
 * Se invoca automáticamente al crear o deshabilitar un admin desde la auditoría,
 * garantizando que el Round-Robin siempre tenga la lista actualizada.
 */
export async function syncOperatorRoster(): Promise<{ success: boolean; count: number }> {
  try {
    getAdminApp();
    const db = getFirestore();

    // Leer todos los admins activos (no deshabilitados)
    const adminsSnap = await db.collection('admins').where('disabled', '!=', true).get();

    const activeOperators: string[] = [];
    const operatorEmails: Record<string, string> = {};

    adminsSnap.forEach((doc) => {
      const data = doc.data();
      activeOperators.push(doc.id); // doc.id === uid
      operatorEmails[doc.id] = data.email || 'Sin correo';
    });

    // Ordenar alfabéticamente por email para consistencia determinística
    activeOperators.sort((a, b) =>
      (operatorEmails[a] || '').localeCompare(operatorEmails[b] || '')
    );

    const rosterRef = db.collection('metadata').doc('operator_roster');
    const currentDoc = await rosterRef.get();
    const currentIndex = currentDoc.exists ? (currentDoc.data()?.nextIndex ?? 0) : 0;

    // Ajustar el índice si la lista se encogió (ej: se deshabilitó un admin)
    const safeIndex = activeOperators.length > 0 ? currentIndex % activeOperators.length : 0;

    await rosterRef.set({
      activeOperators,
      operatorEmails,
      nextIndex: safeIndex,
      lastSync: Timestamp.now(),
    });

    logger.info(
      `[operator-roster] Roster sincronizado: ${activeOperators.length} operadores activos.`
    );

    return { success: true, count: activeOperators.length };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('[operator-roster] Error sincronizando roster:', { error: msg });
    return { success: false, count: 0 };
  }
}
