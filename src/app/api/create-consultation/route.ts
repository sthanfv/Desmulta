import { NextResponse, NextRequest } from 'next/server';

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';
import { ConsultationSchema, SimitCaptureSchema } from '@/lib/definitions';
import { logger } from '@/lib/logger/security-logger';
import { decryptE2EPayload, hashPII, encryptSymmetric } from '@/lib/security/server-crypto';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { apiError } from '@/lib/types/api-response';
import { getNextOperator } from '@/lib/operator-assignment';

/**
 * ⚠️ FIX CRÍTICO v8.11.0:
 *
 * Se eliminó `hashCedulaServer` (que usaba SHA-256 simple sin HMAC secret) y se
 * reemplazó por `hashPII` de `@/lib/security/server-crypto` (HMAC-SHA256 con
 * PII_HMAC_SECRET). El portal de seguimiento en `estado/actions.ts` usaba `hashPII`
 * para buscar, pero esta ruta guardaba un hash distinto → ningún cliente podía
 * acceder al portal de seguimiento de su caso.
 *
 * Además se añade `contactoHash` al documento guardado, que el portal de seguimiento
 * también necesita para autenticar al cliente con cédula + teléfono.
 */

/**
 * Verifica el token de Cloudflare Turnstile en el lado del servidor.
 */
async function verifyTurnstileToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV !== 'production') {
      logger.warn(
        '[turnstile] TURNSTILE_SECRET_KEY no definida. Saltando verificación en desarrollo.'
      );
      return true;
    }
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
    return false;
  }
}

type ConsultationData = z.infer<typeof ConsultationSchema>;
type SimitCaptureData = z.infer<typeof SimitCaptureSchema>;

// 🛡️ AUDITORÍA 2026-08-01: Se eliminó la inicialización preventiva de Firebase fuera del handler.
// El handler POST ya invoca getAdminApp() con su propio manejo de errores + Circuit Breaker.

export async function POST(request: NextRequest) {
  // ------------------------------------------------------------------
  // 1. CAPA 4 REUBICADA: ESCUDO ANTI-ATAQUES INMEDIATO (Upstash Redis)
  // ------------------------------------------------------------------
  const { getSecureIp } = await import('@/lib/security/ip-utils');
  const ip = getSecureIp(request);

  // Usando tu wrapper actual que conecta a Upstash
  const rateLimitStatus = await checkRateLimit('consultation', ip);

  if (!rateLimitStatus.success) {
    const secondsRemaining = Math.max(1, Math.ceil((rateLimitStatus.resetTime - Date.now()) / 1000));
    return NextResponse.json(
      { error: 'TOO_MANY_REQUESTS', message: 'Has superado el límite de consultas permitidas.' },
      { 
        status: 429,
        headers: {
          'Retry-After': secondsRemaining.toString()
        }
      }
    );
  }

  // ------------------------------------------------------------------
  // 2. INICIALIZACIÓN Y LECTURA (Solo se ejecuta si la IP es legítima)
  // ------------------------------------------------------------------
  let tokenConsumed = false;
  getAdminApp();
  const db = getFirestore();

  try {
    const rawBody = await request.text();
    if (!rawBody) {
      return NextResponse.json(apiError('VALIDATION_ERROR', 'Cuerpo de la petición vacío.'), {
        status: 400,
      });
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(apiError('VALIDATION_ERROR', 'Formato JSON inválido.'), {
        status: 400,
      });
    }

    const bodyAsRecord =
      body && typeof body === 'object' ? (body as Record<string, unknown>) : null;

    // 🛡️ Desencriptación E2EE In-Transit
    if (bodyAsRecord && typeof bodyAsRecord.securePayload === 'string') {
      try {
        const decryptedPii = decryptE2EPayload<{
          cedula: string;
          contacto: string;
          emailContacto?: string;
          email?: string;
          ciudad?: string;
        }>(bodyAsRecord.securePayload);
        bodyAsRecord.cedula = decryptedPii.cedula;
        bodyAsRecord.contacto = decryptedPii.contacto;
        if (decryptedPii.emailContacto || decryptedPii.email) {
          bodyAsRecord.emailContacto = decryptedPii.emailContacto || decryptedPii.email;
        }
        if (decryptedPii.ciudad) {
          bodyAsRecord.ciudad = decryptedPii.ciudad;
        }
        delete bodyAsRecord.securePayload;
      } catch (_e) {
        logger.security('[E2EE] Intento de vulneración de cifrado o payload corrupto', {
          error: String(_e),
        });
        return NextResponse.json(
          apiError(
            'ENCRYPTION_ERROR',
            'Carga cifrada corrompida. Intento bloqueado por protocolo de seguridad.'
          ),
          { status: 400 }
        );
      }
    }

    // 🛡️ FIX V2-A2: La detección del tipo de schema NO debe depender del campo
    // 'fuente' enviado por el cliente. Un actor malicioso puede añadir
    // "fuente": "simit_capture" a cualquier request para evadir el
    // ConsultationSchema completo (que exige cédula, placa, etc.) y usar el
    // SimitCaptureSchema más permisivo.
    //
    // La detección correcta es estructural: una captura SIMIT tiene
    // evidenceUrl Y no tiene cédula ni placa directa. Ningún campo controlable
    // por el cliente puede alterar esta decisión.
    const isSimitCapture = Boolean(
      bodyAsRecord?.evidenceUrl && !bodyAsRecord?.cedula && !bodyAsRecord?.placa
    );

    const schema = isSimitCapture ? SimitCaptureSchema : ConsultationSchema;

    const validation = schema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        apiError('VALIDATION_ERROR', 'Datos de entrada no válidos.', validation.error.flatten()),
        { status: 400 }
      );
    }

    const validatedData = validation.data;
    const authorUid = validatedData.authorUid;

    // 🛡️ Honeypot: Detección silenciosa de bots
    if (validatedData.websiteHoneypot && validatedData.websiteHoneypot.length > 0) {
      logger.security('[create-consultation] Honeypot activado — bot detectado', {
        authorUid,
        ip,
      });
      return NextResponse.json(
        {
          success: true,
          docId: 'BOT_TRAPPED',
          message: 'Consulta recibida.',
          shortId: 'EXP-BOT-' + crypto.randomUUID().slice(0, 8),
        },
        { status: 201 }
      );
    }

    if (!authorUid) {
      return NextResponse.json(apiError('VALIDATION_ERROR', 'Falta el UID del autor.'), {
        status: 400,
      });
    }

    const turnstileValid = await verifyTurnstileToken(validatedData.cfToken);
    if (!turnstileValid) {
      logger.security('[create-consultation] Token Turnstile inválido o ausente.', { authorUid });
      return NextResponse.json(
        {
          ...apiError(
            'TURNSTILE_FAILED',
            'Tu seguridad es lo primero. Por favor, asegúrate de que el escudo de protección esté activo y vuelve a intentarlo.'
          ),
          tokenConsumed: false,
        },
        { status: 403 }
      );
    }

    tokenConsumed = true;

    const ocrData = validatedData.ocrData || null;

    // ✅ FIX CRÍTICO: Ahora usamos hashPII (HMAC-SHA256 con PII_HMAC_SECRET) para AMBOS
    // campos — cedula y contacto — que es la misma función que usa estado/actions.ts al
    // buscar. Antes se usaba SHA-256 simple para cedulaHash, lo que causaba que el portal
    // de seguimiento nunca pudiera encontrar la consulta del cliente.
    const cedulaHash =
      !isSimitCapture && (validatedData as ConsultationData).cedula
        ? hashPII((validatedData as ConsultationData).cedula)
        : null;

    const contactoHash = validatedData.contacto ? hashPII(validatedData.contacto) : null;

    const dataToSave = isSimitCapture
      ? ({
          authorUid,
          cedula: 'SIMIT-CAPTURA',
          placa: '',
          nombre: 'VÍA CAPTURA SIMIT',
          contacto: (validatedData as SimitCaptureData).contacto,
          // FIX: también guardamos contactoHash en capturas SIMIT para consistencia
          contactoHash,
          evidenceUrl: (validatedData as SimitCaptureData).evidenceUrl || '',
          emailContacto:
            (bodyAsRecord?.emailContacto as string) || (bodyAsRecord?.email as string) || '',
          aceptoTerminos: validatedData.aceptoTerminos,
          antiguedad: 'N/A',
          tipoInfraccion: 'N/A',
          estadoCoactivo: 'N/A',
          status: 'pendiente' as const,
          fuente: 'simit_capture' as const,
          createdAt: FieldValue.serverTimestamp(),
          telegramStatus: 'pending' as const,
          ocrData,
          requiresManualReview: ocrData?.requiresManualReview ?? false,
          ...(bodyAsRecord?.fcmToken ? { fcmToken: bodyAsRecord.fcmToken as string } : {}),
        } as const)
      : ({
          authorUid,
          // 🔑 HUELLAS ZERO-PII: cédula y teléfono hasheados con HMAC-SHA256
          // Permiten búsqueda estable en el portal de seguimiento sin exponer PII.
          cedulaHash,
          contactoHash,
          cedula: (validatedData as ConsultationData).cedula
            ? encryptSymmetric((validatedData as ConsultationData).cedula)
            : '',
          placa: (validatedData as ConsultationData).placa || '',
          nombre: (validatedData as ConsultationData).nombre,
          contacto: validatedData.contacto,
          emailContacto:
            (bodyAsRecord?.emailContacto as string) ||
            (validatedData as ConsultationData).email ||
            '',
          ciudad:
            (bodyAsRecord?.ciudad as string) ||
            (validatedData as ConsultationData & { ciudad?: string }).ciudad ||
            '',
          evidenceUrl: (validatedData as ConsultationData).evidenceUrl || '',
          aceptoTerminos: validatedData.aceptoTerminos,
          antiguedad: (validatedData as ConsultationData).antiguedad,
          tipoInfraccion: (validatedData as ConsultationData).tipoInfraccion,
          estadoCoactivo: (validatedData as ConsultationData).estadoCoactivo,
          status: 'pendiente' as const,
          fuente: 'web' as const,
          createdAt: FieldValue.serverTimestamp(),
          telegramStatus: 'pending' as const,
          ocrData,
          requiresManualReview: ocrData?.requiresManualReview ?? false,
          ...(bodyAsRecord?.fcmToken ? { fcmToken: bodyAsRecord.fcmToken as string } : {}),
        } as const);

    // Transacción atómica: contador distribuido + consulta + tracking público + idempotencia
    const numShards = 10;
    const shardIndex = Math.floor(Math.random() * numShards);
    const counterRef = db.collection('metadata').doc('counters');
    const shardRef = counterRef.collection('shards').doc(shardIndex.toString());

    // Referencias para las nuevas métricas (Sharding para evitar hotspots de 1 escritura/seg)
    const today = new Date().toISOString().split('T')[0];
    const globalStatsRef = db.collection('system_metrics').doc(`global_stats_shard_${shardIndex}`);
    const dailyStatsRef = db
      .collection('system_metrics')
      .doc(`daily_stats_${today}_shard_${shardIndex}`);

    const consultationRef = db.collection('consultations').doc();
    const trackingUuid = crypto.randomUUID();
    const trackingRef = db.collection('public_tracking').doc(trackingUuid);

    const idempotencyKey = (validatedData as { idempotencyKey?: string }).idempotencyKey;
    const idempotencyRef = idempotencyKey
      ? db.collection('idempotency_keys').doc(idempotencyKey)
      : null;

    const result = await db.runTransaction(async (transaction) => {
      // 1. Verificación de Idempotencia
      if (idempotencyRef) {
        const idempDoc = await transaction.get(idempotencyRef);
        if (idempDoc.exists) {
          const data = idempDoc.data();
          return {
            idSecuencial: data?.shortId,
            trackingUuid: data?.trackingUuid,
            docId: data?.docId,
            alreadyExists: true,
          };
        }
      }

      // 2. 🔄 Round-Robin: asignar operador automáticamente (DEBE SER ANTES DE CUALQUIER WRITE)
      const assignment = await getNextOperator(transaction, db);

      // 3. Lógica existente de shards (Legacy compatibility)
      const shardDoc = await transaction.get(shardRef);
      let shardCount = 1;

      if (shardDoc.exists) {
        shardCount = (shardDoc.data()?.count || 0) + 1;
      }

      transaction.set(shardRef, { count: shardCount }, { merge: true });

      // 4. Incremento de nuevas métricas del sistema (System Metrics)
      transaction.set(
        globalStatsRef,
        {
          type: 'global',
          totalConsultations: FieldValue.increment(1),
          [`status_pendiente`]: FieldValue.increment(1),
          [`infraction_${dataToSave.tipoInfraccion || 'N/A'}`]: FieldValue.increment(1),
        },
        { merge: true }
      );

      transaction.set(
        dailyStatsRef,
        {
          type: 'daily',
          date: today,
          consultations: FieldValue.increment(1),
        },
        { merge: true }
      );

      // 5. Creación de Documentos
      const idSecuencial = `EXP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const internalCounter = `${shardIndex}-${shardCount}`;

      const nameParts = dataToSave.nombre.split(' ');
      const obfuscatedName = nameParts
        .map((part) => (part.length > 0 ? part[0] + '*'.repeat(Math.max(0, part.length - 1)) : ''))
        .join(' ');

      const finalDataToSave = {
        ...dataToSave,
        shortId: idSecuencial,
        internalRef: internalCounter,
        trackingUuid,
        // Sistema de asignación automática de operadores
        ...(assignment.assignedTo
          ? {
              assignedTo: assignment.assignedTo,
              assignedToEmail: assignment.assignedToEmail,
            }
          : {}),
      };

      transaction.set(consultationRef, finalDataToSave);

      transaction.set(trackingRef, {
        shortId: idSecuencial,
        nombreOfuscado: obfuscatedName,
        status: dataToSave.status,
        updatedAt: FieldValue.serverTimestamp(),
      });

      if (finalDataToSave.cedula !== 'SIMIT-CAPTURA' && cedulaHash) {
        const indexRef = db.collection('consultas_index').doc(cedulaHash);
        transaction.set(indexRef, {
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      // Guardar registro de idempotencia
      if (idempotencyRef) {
        transaction.set(idempotencyRef, {
          shortId: idSecuencial,
          trackingUuid,
          docId: consultationRef.id,
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      return { idSecuencial, trackingUuid, docId: consultationRef.id, alreadyExists: false };
    });

    // 🛡️ AUDITORÍA 2026-08-01: E-NX-03 - Webhook para Email Marketing (Retención de Leads)
    if (!result.alreadyExists && process.env.EMAIL_MARKETING_WEBHOOK_URL) {
      try {
        const payload = {
          email: dataToSave.emailContacto,
          nombre: dataToSave.nombre,
          fecha: new Date().toISOString(),
          fuente: dataToSave.fuente,
        };
        // Se ejecuta en background sin bloquear la respuesta al usuario (edge compatible)
        fetch(process.env.EMAIL_MARKETING_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch((err) => logger.warn('[Marketing] Error en webhook:', err));
      } catch (_e) {}
    }

    return NextResponse.json(
      {
        success: true,
        docId: result.docId,
        shortId: result.idSecuencial,
        trackingUuid: result.trackingUuid,
        alreadyExists: result.alreadyExists,
      },
      { status: result.alreadyExists ? 200 : 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    logger.error('[create-consultation] Error crítico:', { error: message });
    return NextResponse.json(
      {
        ...apiError(
          'INTERNAL_ERROR',
          'Lo sentimos, tuvimos un pequeño tropiezo técnico. Por favor, verifica tu conexión e intenta de nuevo en unos momentos.'
        ),
        tokenConsumed,
      },
      { status: 500 }
    );
  }
}
