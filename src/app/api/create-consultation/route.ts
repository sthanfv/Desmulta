import { NextResponse, NextRequest, after } from 'next/server';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';
import { ConsultationSchema } from '@/lib/definitions';
import { logger } from '@/lib/logger/security-logger';
import { analyzeViabilityFlow } from '@/lib/genkit';

// Inicializar Firebase Admin SDK via singleton seguro
try {
  getAdminApp();
} catch (error) {
  const message = error instanceof Error ? error.message : 'Error desconocido';
  logger.error('[firebase-admin] Error de inicialización:', { error: message });
}

export async function POST(request: NextRequest) {
  getAdminApp();
  const db = getFirestore();

  try {
    const rawBody = await request.text();
    if (!rawBody) {
      return NextResponse.json({ error: 'Cuerpo de la petición vacío.' }, { status: 400 });
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Formato JSON inválido.' }, { status: 400 });
    }

    const validation = ConsultationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos de entrada no válidos.', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const {
      cedula,
      placa,
      nombre,
      contacto,
      aceptoTerminos,
      authorUid,
      antiguedad,
      tipoInfraccion,
      estadoCoactivo,
    } = validation.data;

    if (!authorUid) {
      return NextResponse.json({ error: 'Falta el UID del autor.' }, { status: 400 });
    }

    // 2. Rate Limiting Check
    const cooldownRef = db.collection('consultationCooldowns').doc(authorUid);
    const cooldownSnap = await cooldownRef.get();
    const fiveMinutes = 5 * 60 * 1000;

    if (cooldownSnap.exists) {
      const lastAttempt = (cooldownSnap.data()?.lastAttemptAt as Timestamp).toMillis();
      if (Date.now() - lastAttempt < fiveMinutes) {
        return NextResponse.json(
          { error: 'Límite de envíos alcanzado. Por favor, espere 5 minutos.' },
          { status: 429 }
        );
      }
    }

    // 3. Preparar datos para Firestore
    const dataToSave = {
      authorUid,
      cedula,
      placa,
      nombre,
      contacto,
      aceptoTerminos,
      antiguedad,
      tipoInfraccion,
      estadoCoactivo,
      status: 'pendiente' as const,
      fuente: 'web' as const,
      createdAt: FieldValue.serverTimestamp(),
      telegramStatus: 'pending' as const,
    };

    // 4. Transacción atómica: escribir consulta + actualizar cooldown
    const consultationRef = db.collection('consultations').doc();
    await db.runTransaction(async (transaction) => {
      transaction.set(consultationRef, dataToSave);
      transaction.set(cooldownRef, { lastAttemptAt: FieldValue.serverTimestamp() });
    });

    // 5. & 6. Tareas en Background (Next.js 15 after API) - MANDATO-FILTRO
    after(async () => {
      // 5. Notificación Telegram (Consistente y asíncrona, zero-latency directo al módulo)
      try {
        const { sendTelegramNotification } = await import('@/lib/telegram');
        await sendTelegramNotification(consultationRef.id);
      } catch (err) {
        logger.error('[create-consultation] Error en notificación:', { error: String(err) });
      }

      /* 
      // 6. Análisis IA Predictiva (Desactivado temporalmente por solicitud del usuario - v3.3.6)
      try {
        const aiAnalysis = await analyzeViabilityFlow({
          antiquity: antiguedad,
          type: tipoInfraccion,
          coactive: estadoCoactivo,
        });
        await consultationRef.update({ aiAnalysis });
        logger.info('[create-consultation] Análisis IA guardado.', { docId: consultationRef.id });
      } catch (aiError) {
        logger.error('[create-consultation] Fallo en IA:', { error: String(aiError) });
      }
      */
    });

    return NextResponse.json({ success: true, docId: consultationRef.id }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    logger.error('[create-consultation] Error crítico:', { error: message });
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
