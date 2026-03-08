import { NextResponse } from 'next/server';
import { ConsultationSchema } from '@/lib/definitions';
import { logger } from '@/lib/logger/security-logger';

/**
 * Motor de Validación — Desmulta v1.9.2 (Edge)
 *
 * MANDATO-FILTRO:
 * 1. Validación estricta con Zod.
 * 2. Logging seguro con ofuscación PII.
 * 3. Ejecución ultra-rápida sobre Vercel Edge Runtime.
 */

// 🚀 1. Migración a Edge Runtime
export const runtime = 'edge';

const EsquemaValidacion = ConsultationSchema.pick({
  cedula: true,
  placa: true,
});

/**
 * Ofusca un identificador personal para los logs,
 * mostrando solo los últimos 4 caracteres precedidos de asteriscos.
 */
function ofuscarPII(valor: string): string {
  if (!valor || valor.length <= 4) return '****';
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
    const cedulaOfuscada = ofuscarPII(cedula);

    logger.info(`[EDGE] Validando viabilidad para cédula: ${cedulaOfuscada}`);

    // ⚡ 2. Fetch directo a la REST API de Firestore
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID; 
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

    const queryPayload = {
      structuredQuery: {
        from: [{ collectionId: "consultations" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "cedula" },
            op: "EQUAL",
            value: { stringValue: cedula }
          }
        },
        limit: 1
      }
    };

    const response = await fetch(`${firestoreUrl}:runQuery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Token opcional si las reglas lo exigen en un entorno administrado
        ...(process.env.FIREBASE_EDGE_ACCESS_TOKEN 
          ? { 'Authorization': `Bearer ${process.env.FIREBASE_EDGE_ACCESS_TOKEN}` } 
          : {})
      },
      body: JSON.stringify(queryPayload)
    });

    if (!response.ok) {
      throw new Error(`Error en Firestore REST API: ${response.statusText}`);
    }

    const data = await response.json();

    // 3. Evaluar lógica de negocio
    const documentoExiste = data[0]?.document !== undefined;

    if (documentoExiste) {
       logger.warn('[EDGE] Consulta activa preexistente bloqueada', { cedulaOfuscada });
       return NextResponse.json({ 
         success: true, 
         valido: false, 
         mensaje: 'Ya existe una consulta activa para este documento.' 
       });
    }

    logger.info('[EDGE] Validación preliminar exitosa', { placa, cedulaOfuscada });

    return NextResponse.json({
      success: true,
      valido: true,
      mensaje: 'Validación preliminar exitosa. Analizando viabilidad...',
      datos: {
        placa: placa?.toUpperCase() || 'N/A',
        cedula,
      },
    });

  } catch (err) {
    const mensaje = err instanceof Error ? err.message : 'Error desconocido';
    logger.error('[EDGE Error] Fallo en la validación:', { error: mensaje });
    
    return NextResponse.json(
      { error: 'Error interno en el motor de validación' }, 
      { status: 500 }
    );
  }
}

