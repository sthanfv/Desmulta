import { NextResponse, NextRequest, after } from 'next/server';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';
import { ConsultationSchema, SimitCaptureSchema } from '@/lib/definitions';
import { logger } from '@/lib/logger/security-logger';
import { z } from 'zod';
import crypto from 'crypto';
// IA Removida por solicitud del usuario - v2.1.0

/**
 * MANDATO-FILTRO: Verificación server-side del token Cloudflare Turnstile.
 * Un token vacío, inválido o de un dominio diferente será rechazado aquí.
 * Docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
async function verifyTurnstileToken(token: string | undefined): Promise<boolean> {
  // Sin token → rechazar siempre (no fail-open en producción)
  if (!token) return false;

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // En desarrollo sin la key configurada, emitir advertencia y pasar
    if (process.env.NODE_ENV !== 'production') {
      logger.warn(
        '[turnstile] TURNSTILE_SECRET_KEY no definida. Saltando verificación en desarrollo.'
      );
      return true;
    }
    // En producción sin la key: bloquear y alertar
    logger.error('[turnstile] TURNSTILE_SECRET_KEY ausente en producción. Bloqueando petición.');
    return false;
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secret);
    formData.append('response', token);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    const data = (await res.json()) as { success: boolean; 'error-codes'?: string[] };

    if (!data.success) {
      if (process.env.NODE_ENV !== 'production') {
        logger.warn(
          `[turnstile] Fallo en desarrollo (${data['error-codes']?.join(', ') || 'sin códigos'}). Tolerado.`
        );
        return true;
      }
      logger.security('[turnstile] Token inválido rechazado por Cloudflare.', {
        errorCodes: data['error-codes'],
      });
    }

    return data.success;
  } catch (err) {
    logger.error('[turnstile] Error al contactar API de Cloudflare:', { error: String(err) });
    // Fail-closed: ante un error de red, bloqueamos la petición
    return false;
  }
}

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

    // 1.5. MANDATO-FILTRO: Verificación Turnstile (Anti-Bot Server-Side)
    const turnstileValid = await verifyTurnstileToken(validatedData.turnstileToken);
    if (!turnstileValid) {
      logger.security('[create-consultation] Token Turnstile inválido o ausente.', { authorUid });
      return NextResponse.json(
        {
          error:
            'Tu seguridad es lo primero. Por favor, asegúrate de que el escudo de protección esté activo y vuelve a intentarlo.',
        },
        { status: 403 }
      );
    }

    // 2. Rate Limiting Check
    const cooldownRef = db.collection('consultationCooldowns').doc(authorUid);
    const cooldownSnap = await cooldownRef.get();
    const fiveMinutes = 5 * 60 * 1000;

      if (cooldownSnap.exists) {
        const lastAttempt = (cooldownSnap.data()?.lastAttemptAt as Timestamp).toMillis();
        const elapsedMs = Date.now() - lastAttempt;
        if (elapsedMs < fiveMinutes) {
          const remainingMinutes = Math.ceil((fiveMinutes - elapsedMs) / 60000);
          return NextResponse.json(
            {
              error: `¡Vas muy rápido! Para proteger tu información, por favor espera ${remainingMinutes} ${remainingMinutes === 1 ? 'minuto' : 'minutos'} antes de enviar otra consulta.`,
            },
            {
              status: 429,
              headers: { 'Retry-After': String(Math.ceil((fiveMinutes - elapsedMs) / 1000)) },
            }
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

      // MANDATO-FILTRO: Guardar en el índice público ciego (O(1) Validation Edge)
      if (finalDataToSave.cedula !== 'SIMIT-CAPTURA') {
        const hashValue = crypto.createHash('sha256').update(finalDataToSave.cedula).digest('hex');
        const indexRef = db.collection('consultas_index').doc(hashValue);
        transaction.set(indexRef, {
          createdAt: FieldValue.serverTimestamp(),
        });
      }

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

      // 6. Análisis IA Predictiva (Desactivado preventivamente - v2.1.2)
      /* 
      La lógica de IA ha sido purgada del sistema por directriz técnica.
      Se prioriza el análisis humano determinístico.
      */
    });

    return NextResponse.json({ success: true, docId: consultationRef.id }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    logger.error('[create-consultation] Error crítico:', { error: message });
    return NextResponse.json(
      {
        error:
          'Lo sentimos, tuvimos un pequeño tropiezo técnico. Por favor, verifica tu conexión e intenta de nuevo en unos momentos.',
      },
      { status: 500 }
    );
  }
}
