'use server';

import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { hashPII } from '@/lib/security/server-crypto';
import { logger } from '@/lib/logger/security-logger';

/**
 * User Activity Actions — Desmulta v8.5.0
 *
 * CORRECCIÓN ARQUITECTURAL v8.5.0:
 * La búsqueda anterior por `authorUid` (UID anónimo de Firebase) era inestable porque
 * Firebase asigna un UID diferente en cada sesión nueva o navegador.
 *
 * NUEVA ESTRATEGIA: Buscar por `cedulaHash` (SHA-256 de la cédula), que es un
 * identificador estable y Zero-PII que no cambia entre sesiones.
 *
 * El cliente envía la cédula en texto plano (dentro del túnel HTTPS), el servidor
 * la hashea y busca por esa huella digital.
 */

export async function getConsultationActivity(cedula: string) {
  try {
    // Validación básica de entrada
    if (!cedula || cedula.trim().length < 5) {
      return { success: false, error: 'Número de cédula inválido.' };
    }

    // Solo dígitos permitidos
    const cedulaLimpia = cedula.replace(/\D/g, '');
    if (cedulaLimpia.length < 5 || cedulaLimpia.length > 12) {
      return { success: false, error: 'Formato de cédula inválido.' };
    }

    // ✅ CORRECCIÓN ENTERPRISE v4: Se usa hashPII (HMAC-SHA256 con PII_HMAC_SECRET)
    // para buscar la cédula en Firestore, ya que las consultas se persisten usando ese hash.
    const cedulaHash = hashPII(cedulaLimpia);

    getAdminApp();
    const db = getFirestore();

    // 1. Buscar en Consultations por cedulaHash (estable entre sesiones)
    const consultationSnap = await db
      .collection('consultations')
      .where('cedulaHash', '==', cedulaHash)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    // 2. Buscar en Cases por cedulaHash
    const casesSnap = await db
      .collection('cases')
      .where('cedulaHash', '==', cedulaHash)
      .limit(20)
      .get();

    // Si no hay resultados por cedulaHash, puede ser un registro antiguo (pre v8.5.0)
    // En ese caso retornamos estado vacío sin error para no frustrar al usuario
    const deudas = consultationSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        shortId: data.shortId || doc.id.slice(0, 8).toUpperCase(),
        status: data.status || 'pendiente',
        monto: data.total_deuda_acumulada || 0,
        fecha: data.createdAt?.toDate?.() || new Date(),
      };
    });

    const tramites = casesSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        status: data.status || 'En proceso',
        referencia: data.shortId || doc.id.slice(0, 8).toUpperCase(),
      };
    });

    const totalDeuda = deudas.reduce((sum, d) => sum + (d.monto || 0), 0);

    logger.info('[user-activity] Actividad recuperada exitosamente', {
      hashPrefix: cedulaHash.slice(0, 8), // Solo prefijo en logs (Zero-PII)
      consultas: deudas.length,
      casos: tramites.length,
    });

    return {
      success: true,
      data: {
        totalDeuda,
        conteoConsultas: deudas.length,
        conteoCasos: tramites.length,
        consultasRecientes: deudas.slice(0, 5),
        casosActivos: tramites,
        tieneDatos: deudas.length > 0 || tramites.length > 0,
      },
    };
  } catch (error) {
    logger.error('[user-activity] Error al recuperar actividad:', { error: String(error) });
    return { success: false, error: 'No se pudo recuperar la actividad legal.' };
  }
}
