import { NextResponse } from 'next/server';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';
import { ConsultationSchema } from '@/lib/definitions';
import { logger } from '@/lib/logger/security-logger';

/**
 * Motor de Validación — Desmulta v1.9.0
 *
 * MANDATO-FILTRO:
 * 1. Validación estricta con Zod.
 * 2. Rate Limiting persistente en Firestore.
 * 3. Logging ofuscado — H5: PII (cédula) truncada a últimos 4 dígitos en logs.
 */

// Esquema parcial para validación rápida (solo cédula y placa)
const EsquemaValidacion = ConsultationSchema.pick({
  cedula: true,
  placa: true,
});

/**
 * Ofusca un identificador personal para los logs,
 * mostrando solo los últimos 4 caracteres precedidos de asteriscos.
 * Ej: "1090123456" → "****3456"
 *
 * @param valor - El valor sensible original (ej. número de cédula)
 * @returns Versión ofuscada segura para registrar en logs
 */
function ofuscarPII(valor: string): string {
  if (valor.length <= 4) return '****';
  return `****${valor.slice(-4)}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Validación con Zod (Sanitización y Tipado)
    const resultado = EsquemaValidacion.safeParse(body);
    if (!resultado.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', detalles: resultado.error.flatten() },
        { status: 400 }
      );
    }

    const { cedula, placa } = resultado.data;
    // H5: Ofuscación de PII para uso exclusivo en logs
    const cedulaOfuscada = ofuscarPII(cedula);

    // 2. Inicializar Firebase y DB
    getAdminApp();
    const db = getFirestore();

    // 3. Rate Limiting — prevención de enumeración de cédulas
    const cooldownRef = db.collection('validationCooldowns').doc(cedula);
    const cooldownSnap = await cooldownRef.get();
    const periodoCooldown = 2 * 60 * 1000; // 2 minutos

    if (cooldownSnap.exists) {
      const ultimoIntento = (cooldownSnap.data()?.lastAttemptAt as Timestamp).toMillis();
      if (Date.now() - ultimoIntento < periodoCooldown) {
        // H5: Solo se registra la cédula ofuscada — NUNCA en claro
        logger.warn('[validar-consulta] Rate limit activado', { cedulaOfuscada });
        return NextResponse.json(
          { error: 'Demasiados intentos. Espere 2 minutos.' },
          { status: 429 }
        );
      }
    }

    // Actualizar cooldown
    await cooldownRef.set({
      lastAttemptAt: FieldValue.serverTimestamp(),
      ipHash: request.headers.get('x-forwarded-for') || 'desconocido',
    });

    logger.info('[validar-consulta] Validación exitosa', { placa, cedulaOfuscada });

    return NextResponse.json({
      success: true,
      mensaje: 'Validación preliminar exitosa. Analizando viabilidad...',
      datos: {
        placa: placa?.toUpperCase() || 'N/A',
        cedula,
      },
    });
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : 'Error desconocido';
    logger.error('[validar-consulta] Error crítico:', { error: mensaje });
    return NextResponse.json({ error: 'Error interno en el motor de validación' }, { status: 500 });
  }
}

