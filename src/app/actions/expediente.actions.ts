'use server';

import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger/security-logger';
import { hashPII } from '@/lib/security/server-crypto';

import { z } from 'zod';

const ConsolidarSchema = z.object({
  cedula: z
    .string()
    .min(5, { message: 'La cédula debe tener al menos 5 caracteres.' })
    .max(20, { message: 'La cédula no puede tener más de 20 caracteres.' })
    .regex(/^[0-9]+$/, { message: 'La cédula solo debe contener números.' })
    .trim(),
  nuevasMultas: z.array(
    z.object({
      comparendo: z.string(),
      fecha: z.string(),
      valor: z.number(),
      estado: z.string(),
    })
  ),
  telefono: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .pipe(
      z.string().regex(/^3[0-9]{9}$/, {
        message: 'Debe ser un número de celular colombiano válido (10 dígitos).',
      })
    ),
  nombre: z.string().trim().max(60).optional(),
});

type ConsolidarPayload = z.infer<typeof ConsolidarSchema>;

/**
 * Server Action de Consolidación (FinOps)
 * Evita la creación redundante de documentos y usa operaciones atómicas de Firestore.
 */
export async function consolidarExpedienteEnDB(payloadParams: ConsolidarPayload) {
  try {
    const { headers } = await import('next/headers');
    const headerStore = await headers();
    const ip = headerStore.get('x-forwarded-for')?.split(',')[0] || 'unknown-ip';

    const { rateLimit } = await import('@/lib/security/rate-limit');
    const { success } = await rateLimit(ip, 10, 60 * 1000, 'expediente_action_rl');
    if (!success) {
      throw new Error('Too many requests. Intente más tarde.');
    }

    const payload = ConsolidarSchema.parse(payloadParams);

    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);
    const leadsRef = db.collection('leads');

    // Hasheamos PII antes de cualquier interacción con Firestore
    const cedulaHash = hashPII(payload.cedula);
    const telefonoHash = hashPII(payload.telefono);

    // 1. Buscamos si el usuario ya existe por su huella criptográfica
    const snapshot = await leadsRef.where('cedulaHash', '==', cedulaHash).limit(1).get();

    // 2. Calcular el valor total de este lote específico
    const valorNuevoLote = payload.nuevasMultas.reduce((acc, m) => acc + m.valor, 0);

    if (snapshot.empty) {
      // CASO A: Usuario Nuevo. Creamos su expediente maestro (Zero-PII).
      const docRef = await leadsRef.add({
        cedulaHash,
        telefonoHash,
        estado_gestion: 'NUEVO',
        fuente: 'EXPEDIENTE_UNICO',
        fecha_creacion: FieldValue.serverTimestamp(),
        ultima_actualizacion: FieldValue.serverTimestamp(),
        total_deuda_acumulada: valorNuevoLote,
        multas_registradas: payload.nuevasMultas,
      });

      logger.info('[FinOps] Nuevo expediente creado (Zero-PII):', {
        docId: docRef.id,
        hashPrefix: cedulaHash.slice(0, 8),
      });
      return { success: true, status: 'creado', message: 'Expediente maestro creado.' };
    } else {
      // CASO B: Usuario Recurrente. Hacemos MERGE (Ahorro masivo de DB)
      const docId = snapshot.docs[0].id;

      await leadsRef.doc(docId).update({
        ultima_actualizacion: FieldValue.serverTimestamp(),
        total_deuda_acumulada: FieldValue.increment(valorNuevoLote),
        multas_registradas: FieldValue.arrayUnion(...payload.nuevasMultas),
        esRecurrente: true,
        conteoRetornos: FieldValue.increment(1),
        // Actualizamos huella de teléfono por si cambió
        telefonoHash,
      });

      logger.info('[FinOps] Expediente consolidado (Zero-PII):', {
        docId,
        hashPrefix: cedulaHash.slice(0, 8),
        multasNuevas: payload.nuevasMultas.length,
      });
      return {
        success: true,
        status: 'actualizado',
        message: 'Expediente actualizado con nuevas infracciones.',
      };
    }
  } catch (error) {
    logger.error('[DevSecOps] Error consolidando expediente:', error);
    // Propagamos el error original para que el test pueda validarlo
    throw error;
  }
}
