import { NextResponse, NextRequest } from 'next/server';

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';
import { ConsultationSchema, SimitCaptureSchema } from '@/lib/definitions';
import { logger } from '@/lib/logger/security-logger';
import { decryptE2EPayload, hashPII } from '@/lib/security/server-crypto';
import { z } from 'zod';
import { rateLimit } from '@/lib/security/rate-limit';

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

try {
  getAdminApp();
} catch (error) {
  const message = error instanceof Error ? error.message : 'Error desconocido';
  logger.error('[firebase-admin] Fallo preventivo de inicialización:', { error: message });
}

export async function POST(request: NextRequest) {
  let tokenConsumed = false;
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
          { error: 'Carga cifrada corrompida. Intento bloqueado por protocolo de seguridad.' },
          { status: 400 }
        );
      }
    }

    const isSimitCapture = bodyAsRecord?.fuente === 'simit_capture';
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

    // 🛡️ Honeypot: Detección silenciosa de bots
    if (validatedData.websiteHoneypot && validatedData.websiteHoneypot.length > 0) {
      logger.security('[create-consultation] Honeypot activado — bot detectado', {
        authorUid,
        ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
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
      return NextResponse.json({ error: 'Falta el UID del autor.' }, { status: 400 });
    }

    // 🛡️ Rate Limit: máximo 5 intentos cada 5 minutos por usuario + IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown-ip';
    const rateLimitIdentifier = `${authorUid}_${ip}`;
    const { success, reset, isError } = await rateLimit(
      rateLimitIdentifier,
      5,
      5 * 60 * 1000,
      'consultationCooldowns'
    );

    if (!success) {
      if (isError) {
        logger.error(`[SECURITY] Rate Limit falló por error de infraestructura para: ${authorUid}`);
        return NextResponse.json(
          {
            error:
              'Servicio temporalmente no disponible por mantenimiento de seguridad. Por favor, intente de nuevo en un momento.',
            tokenConsumed,
          },
          { status: 500 }
        );
      }

      const remainingMs = reset;
      const remainingMinutes = Math.floor(remainingMs / 60000);
      const remainingSeconds = Math.ceil((remainingMs % 60000) / 1000);

      let timeStr = '';
      if (remainingMinutes > 0) {
        timeStr = `${remainingMinutes} ${remainingMinutes === 1 ? 'minuto' : 'minutos'}`;
        if (remainingSeconds > 0) {
          timeStr += ` y ${remainingSeconds} ${remainingSeconds === 1 ? 'segundo' : 'segundos'}`;
        }
      } else {
        timeStr = `${remainingSeconds} ${remainingSeconds === 1 ? 'segundo' : 'segundos'}`;
      }

      return NextResponse.json(
        {
          error: `¡Pausa de seguridad! Para proteger tu información, por favor espera ${timeStr} antes de enviar otra consulta.`,
          tokenConsumed,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil(remainingMs / 1000)) },
        }
      );
    }

    const turnstileValid = await verifyTurnstileToken(validatedData.cfToken);
    if (!turnstileValid) {
      logger.security('[create-consultation] Token Turnstile inválido o ausente.', { authorUid });
      return NextResponse.json(
        {
          error:
            'Tu seguridad es lo primero. Por favor, asegúrate de que el escudo de protección esté activo y vuelve a intentarlo.',
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
          ...(bodyAsRecord?.fcmToken ? { fcmToken: bodyAsRecord.fcmToken as string } : {}),
        } as const)
      : ({
          authorUid,
          // 🔑 HUELLAS ZERO-PII: cédula y teléfono hasheados con HMAC-SHA256
          // Permiten búsqueda estable en el portal de seguimiento sin exponer PII.
          cedulaHash,
          contactoHash,
          cedula: (validatedData as ConsultationData).cedula,
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
          ...(bodyAsRecord?.fcmToken ? { fcmToken: bodyAsRecord.fcmToken as string } : {}),
        } as const);

    // Transacción atómica: contador distribuido + consulta + tracking público
    const numShards = 10;
    const shardIndex = Math.floor(Math.random() * numShards);
    const counterRef = db.collection('metadata').doc('counters');
    const shardRef = counterRef.collection('shards').doc(shardIndex.toString());

    const consultationRef = db.collection('consultations').doc();
    const trackingUuid = crypto.randomUUID();
    const trackingRef = db.collection('public_tracking').doc(trackingUuid);

    const { idSecuencial } = await db.runTransaction(async (transaction) => {
      const shardDoc = await transaction.get(shardRef);
      let shardCount = 1;

      if (shardDoc.exists) {
        shardCount = (shardDoc.data()?.count || 0) + 1;
      }

      transaction.set(shardRef, { count: shardCount }, { merge: true });

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
      };

      transaction.set(consultationRef, finalDataToSave);

      transaction.set(trackingRef, {
        shortId: idSecuencial,
        nombreOfuscado: obfuscatedName,
        status: dataToSave.status,
        updatedAt: FieldValue.serverTimestamp(),
      });

      if (finalDataToSave.cedula !== 'SIMIT-CAPTURA') {
        const hashValue = hashPII(finalDataToSave.cedula);
        const indexRef = db.collection('consultas_index').doc(hashValue);
        transaction.set(indexRef, {
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      return { idSecuencial };
    });

    return NextResponse.json(
      { success: true, docId: consultationRef.id, shortId: idSecuencial, trackingUuid },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    logger.error('[create-consultation] Error crítico:', { error: message });
    return NextResponse.json(
      {
        error:
          'Lo sentimos, tuvimos un pequeño tropiezo técnico. Por favor, verifica tu conexión e intenta de nuevo en unos momentos.',
        tokenConsumed,
      },
      { status: 500 }
    );
  }
}
