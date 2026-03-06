import { NextResponse, NextRequest, after } from 'next/server';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';
import { ConsultationSchema, SimitCaptureSchema } from '@/lib/definitions';
import { logger } from '@/lib/logger/security-logger';
import { z } from 'zod';
// import { analyzeViabilityFlow } from '@/lib/genkit';

type ConsultationData = z.infer<typeof ConsultationSchema>;
type SimitCaptureData = z.infer<typeof SimitCaptureSchema>;

// Inicializar Firebase Admin SDK via singleton seguro
try {
  getAdminApp();
} catch (error) {
  const message = error instanceof Error ? error.message : 'Error desconocido';
  logger.error('[firebase-admin] Error de inicialización:', { error: message });
}

/**
 * La función generarIdCorto ha sido deprecada en v5.8.0
 * en favor de la transacción atómica con contador secuencial.
 */

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

    // Detectar flujo SIMIT vs flujo completo
    const rawBody2 = body as Record<string, unknown>;
    const isSimitCapture = rawBody2.fuente === 'simit_capture';
    const schema = isSimitCapture ? SimitCaptureSchema : ConsultationSchema;

    const validation = schema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos de entrada no válidos.', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const validatedData = validation.data;
    const authorUid = validatedData.authorUid;

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

    // 2.1 Actualizar Cooldown (MANDATO-FILTRO: Persistencia de Seguridad)
    await cooldownRef.set({
      lastAttemptAt: FieldValue.serverTimestamp(),
    });

    // 3. Preparar base de datos para Firestore

    const dataToSave = isSimitCapture
      ? ({
        authorUid,
        cedula: 'SIMIT-CAPTURA',
        placa: '',
        nombre: 'VÍA CAPTURA SIMIT',
        contacto: (validatedData as SimitCaptureData).contacto,
        aceptoTerminos: validatedData.aceptoTerminos,
        antiguedad: 'N/A',
        tipoInfraccion: 'N/A',
        estadoCoactivo: 'N/A',
        evidenceUrl: (validatedData as SimitCaptureData).evidenceUrl || null,
        status: 'pendiente' as const,
        fuente: 'simit_capture' as const,
        createdAt: FieldValue.serverTimestamp(),
        telegramStatus: 'pending' as const,
      } as const)
      : ({
        authorUid,
        cedula: (validatedData as ConsultationData).cedula,
        placa: (validatedData as ConsultationData).placa || '',
        nombre: (validatedData as ConsultationData).nombre,
        contacto: validatedData.contacto,
        aceptoTerminos: validatedData.aceptoTerminos,
        antiguedad: (validatedData as ConsultationData).antiguedad,
        tipoInfraccion: (validatedData as ConsultationData).tipoInfraccion,
        estadoCoactivo: (validatedData as ConsultationData).estadoCoactivo,
        evidenceUrl: (validatedData as ConsultationData).evidenceUrl || null,
        status: 'pendiente' as const,
        fuente: 'web' as const,
        createdAt: FieldValue.serverTimestamp(),
        telegramStatus: 'pending' as const,
      } as const);

    // 4. Transacción atómica: Incrementar contador + escribir consulta + actualizar cooldown
    const counterRef = db.collection('metadata').doc('counters');
    const consultationRef = db.collection('consultations').doc();

    const { idSecuencial } = await db.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let newCount = 1;

      if (counterDoc.exists) {
        newCount = (counterDoc.data()?.totalConsultas || 0) + 1;
      }

      // Actualizar contador maestro
      transaction.set(counterRef, { totalConsultas: newCount }, { merge: true });

      // Generar ID Secuencial (ej: CASO-042)
      const idSecuencial = `CASO-${newCount.toString().padStart(3, '0')}`;

      // Inyectar ID secuencial en el objeto final
      const finalDataToSave = {
        ...dataToSave,
        shortId: idSecuencial,
      };

      transaction.set(consultationRef, finalDataToSave);
      transaction.set(cooldownRef, { lastAttemptAt: FieldValue.serverTimestamp() });

      return { idSecuencial };
    });

    // 5. & 6. Tareas en Background (Next.js 15 after API) - MANDATO-FILTRO
    after(async () => {
      // 5. Notificación Telegram (Consistente y asíncrona, zero-latency directo al módulo)
      try {
        const { sendTelegramNotification } = await import('@/lib/telegram');
        await sendTelegramNotification(consultationRef.id);
      } catch (err) {
        logger.error('[create-consultation] Error en notificación Telegram:', {
          error: String(err),
        });
      }

      // 6. Notificación Email via Resend (v5.15.0)
      if (!isSimitCapture && 'email' in validatedData && validatedData.email) {
        try {
          const { enviarCorreoBienvenida } = await import('@/lib/email');
          const data = validatedData as ConsultationData;
          const placaFinal = data.placa || 'N/A';
          const nombreFinal = data.nombre || 'Usuario Desmulta';

          await enviarCorreoBienvenida(data.email as string, nombreFinal, idSecuencial, placaFinal);
          logger.info('[create-consultation] Correo de bienvenida enviado.', {
            email: data.email,
          });
        } catch (emailErr) {
          logger.error('[create-consultation] Error en notificación Email:', {
            error: String(emailErr),
          });
        }
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
