import { NextResponse } from 'next/server';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';
import { ConsultationSchema } from '@/lib/definitions';
import { logger } from '@/lib/logger/security-logger';

/**
 * Motor de Validation — Desmulta v5.19.0
 *
 * MANDATO-FILTRO:
 * 1. Validación estricta con Zod.
 * 2. Rate Limiting persistente.
 * 3. Logging ofuscado.
 */

// Definir esquema parcial para validación rápida (solo cédula y placa)
const ValidationSchema = ConsultationSchema.pick({
  cedula: true,
  placa: true,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Validación con Zod (Sanitización y Tipado)
    const result = ValidationSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { cedula, placa } = result.data;

    // 2. Inicializar Firebase y DB (Edge Compatible via Admin SDK if configured)
    // Nota: El runtime 'edge' puede tener limitaciones con firebase-admin
    // dependiendo de la versión y entorno de despliegue.
    // En Vercel Edge, preferimos usar fetch para Firestore o el SDK ligero.
    // Para simplificar y mantener consistencia con create-consultation:
    getAdminApp();
    const db = getFirestore();

    // 3. Rate Limiting (MANDATO-FILTRO: Prevención de Enumeración)
    // Usamos un identificador basado en la cédula para limitar consultas sobre la misma persona
    const cooldownRef = db.collection('validationCooldowns').doc(cedula);
    const cooldownSnap = await cooldownRef.get();
    const cooldownPeriod = 2 * 60 * 1000; // 2 minutos para validación previa

    if (cooldownSnap.exists) {
      const lastAttempt = (cooldownSnap.data()?.lastAttemptAt as Timestamp).toMillis();
      if (Date.now() - lastAttempt < cooldownPeriod) {
        logger.warn('[validar-consulta] Rate limit activado', { cedula });
        return NextResponse.json(
          { error: 'Demasiados intentos. Espere 2 minutos.' },
          { status: 429 }
        );
      }
    }

    // Actualizar cooldown
    await cooldownRef.set({
      lastAttemptAt: FieldValue.serverTimestamp(),
      ipHash: request.headers.get('x-forwarded-for') || 'unknown', // Opcional: hash de IP
    });

    logger.info('[validar-consulta] Validación exitosa', { placa, cedula });

    return NextResponse.json({
      success: true,
      mensaje: 'Validación preliminar exitosa. Analizando viabilidad...',
      datos: {
        placa: placa?.toUpperCase() || 'N/A',
        cedula,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    logger.error('[validar-consulta] Error crítico:', { error: message });
    return NextResponse.json({ error: 'Error interno en el motor de validación' }, { status: 500 });
  }
}
