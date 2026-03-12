'use server';

import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger/security-logger';

interface ConsolidarPayload {
  cedula: string;
  nuevasMultas: Array<{
    comparendo: string;
    fecha: string;
    valor: number;
    estado: string;
  }>;
  telefono: string;
  nombre?: string;
}

/**
 * Server Action de Consolidación (FinOps)
 * Evita la creación redundante de documentos y usa operaciones atómicas de Firestore.
 */
export async function consolidarExpedienteEnDB(payload: ConsolidarPayload) {
  try {
    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);
    const leadsRef = db.collection('leads');
    
    // 1. Buscamos si el usuario ya existe por su Cédula
    const snapshot = await leadsRef.where('cedula', '==', payload.cedula).limit(1).get();

    // 2. Calcular el valor total de este lote específico
    const valorNuevoLote = payload.nuevasMultas.reduce((acc, m) => acc + m.valor, 0);

    if (snapshot.empty) {
      // CASO A: Usuario Nuevo. Creamos su expediente maestro.
      const docRef = await leadsRef.add({
        cedula: payload.cedula,
        telefono: payload.telefono,
        nombre: payload.nombre || 'No proporcionado',
        estado_gestion: 'NUEVO',
        fuente: 'EXPEDIENTE_UNICO',
        fecha_creacion: FieldValue.serverTimestamp(),
        ultima_actualizacion: FieldValue.serverTimestamp(),
        total_deuda_acumulada: valorNuevoLote,
        multas_registradas: payload.nuevasMultas,
      });
      
      logger.info('[FinOps] Nuevo expediente creado:', { docId: docRef.id, cedula: payload.cedula });
      return { success: true, message: 'Expediente maestro creado.' };
    } else {
      // CASO B: Usuario Recurrente. Hacemos MERGE (Ahorro masivo de DB)
      const docId = snapshot.docs[0].id;
      
      await leadsRef.doc(docId).update({
        ultima_actualizacion: FieldValue.serverTimestamp(),
        total_deuda_acumulada: FieldValue.increment(valorNuevoLote),
        multas_registradas: FieldValue.arrayUnion(...payload.nuevasMultas),
        // Actualizamos teléfono si cambió
        telefono: payload.telefono, 
      });

      logger.info('[FinOps] Expediente consolidado:', { docId, cedula: payload.cedula, multasNuevas: payload.nuevasMultas.length });
      return { success: true, message: 'Expediente actualizado con nuevas infracciones.' };
    }
  } catch (error) {
    logger.error('[DevSecOps] Error consolidando expediente:', error);
    throw new Error('Fallo al sincronizar el expediente seguro.');
  }
}
