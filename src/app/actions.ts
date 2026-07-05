/**
 * TODAS LAS DECISIONES, ARCHIVOS Y CÓDIGO GENERADO DEBEN PASAR EL FILTRO
 * DE SEGURIDAD Y CALIDAD 'MANDATO-FILTRO'
 *
 * Server Actions para Desmulta (v1.0.0)
 * PURGA DE IA: Eliminada integración con Google Gemini y Chat.
 */

'use server';

import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger/security-logger';

/**
 * NOTA: Las funciones 'enviarAnalisis' y 'enviarCorreoBienvenida' han sido migradas
 * a Firebase Cloud Functions (onConsultationCreated) para mejorar la fiabilidad.
 * Next.js ahora solo se encarga de la persistencia de datos.
 */
/**
 * Consulta un caso por su UUID de seguimiento seguro (Materialized View).
 * Devuelve solo información de la colección pública public_tracking.
 */
export async function getCaseByTrackingUuid(uuid: string) {
  const db = getFirestore();
  try {
    const docRef = db.collection('public_tracking').doc(uuid);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return { success: false, error: 'Seguimiento no encontrado' };
    }

    const data = docSnap.data()!;

    return {
      success: true,
      case: {
        shortId: data.shortId,
        status: data.status || 'pendiente',
        nombre: data.nombreOfuscado || 'Usuario',
        updatedAt:
          data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : null,
      },
    };
  } catch (error) {
    logger.error('Error consultando seguimiento por UUID:', { uuid, error: String(error) });
    return { success: false, error: 'Error interno en consulta' };
  }
}
