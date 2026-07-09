/**
 * DESMULTA — Server Action para Referidos VIP (v8.11.0)
 *
 * Cambios respecto a versiones anteriores:
 *   - FIX CRÍTICO: Detección de referidos duplicados (mismo par tuNumero+suNumero).
 *   - FIX: Verificación de que el referido aún no sea ya cliente de Desmulta (evita
 *     referir a alguien que ya está en el sistema, lo cual no aporta valor y genera
 *     reclamos de comisión fraudulentos).
 *   - MEJORA: El mensaje de error "consulta pendiente" ahora distingue entre
 *     consultas pendientes normales y las que ya tienen proceso activo.
 *   - MEJORA: Se agrega `source` al documento guardado para trazabilidad.
 */

'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';
import { logger } from '@/lib/logger/security-logger';
import { rateLimit } from '@/lib/security/rate-limit';

export interface ReferralResponse {
  success: boolean;
  error?: string;
}

// ─── Schema de Validación Zod ────────────────────────────────────────────────
const ReferralSchema = z
  .object({
    tuNumero: z
      .string()
      .min(10, 'El número debe tener al menos 10 dígitos.')
      .max(15, 'El número no puede superar 15 dígitos.')
      .regex(/^\d+$/, 'Solo se permiten dígitos numéricos.'),
    suNumero: z
      .string()
      .min(10, 'El número del referido debe tener al menos 10 dígitos.')
      .max(15, 'El número del referido no puede superar 15 dígitos.')
      .regex(/^\d+$/, 'Solo se permiten dígitos numéricos.'),
  })
  .refine((data) => data.tuNumero !== data.suNumero, {
    message: 'No puedes referirte a ti mismo. Ingresa el número de otra persona.',
    path: ['suNumero'],
  });

export async function registerReferral(
  tuNumero: string,
  suNumero: string,
  emailHoneypot: string = ''
): Promise<ReferralResponse> {
  // ── 1. Honeypot anti-bot ─────────────────────────────────────────────────
  if (emailHoneypot) {
    logger.warn('[registerReferral] Intento de spam detectado por Honeypot.', {
      honeypotContent: emailHoneypot.substring(0, 50),
    });
    // Delay artificial para despistar bots
    await new Promise((resolve) => setTimeout(resolve, 2500));
    return { success: true }; // Falso positivo silencioso
  }

  // ── 2. Rate Limiting por IP ──────────────────────────────────────────────
  try {
    const headersList = await headers();
    const { getSecureIp } = await import('@/lib/security/ip-utils');
    const ip = getSecureIp(headersList);

    const rl = await rateLimit(ip, 5, 24 * 60 * 60 * 1000, 'referidosCooldowns');

    if (!rl.success && !rl.isError) {
      const hours = Math.ceil(rl.reset / (1000 * 60 * 60));
      logger.warn(`[registerReferral] Rate limit superado para IP: ${ip.substring(0, 8)}***`);
      return {
        success: false,
        error: `Has alcanzado el límite diario de referencias. Por favor espera ${hours} hora${hours !== 1 ? 's' : ''} antes de volver a intentarlo.`,
      };
    }

    if (rl.isError) {
      logger.warn('[registerReferral] Rate-limit falló por error de infra — permitiendo.');
    }
  } catch (rlErr) {
    logger.warn('[registerReferral] No se pudo aplicar rate-limit:', { error: String(rlErr) });
  }

  // ── 3. Validación Zod estricta ───────────────────────────────────────────
  const rawTu = tuNumero.replace(/\D/g, '');
  const rawSu = suNumero.replace(/\D/g, '');

  const validation = ReferralSchema.safeParse({ tuNumero: rawTu, suNumero: rawSu });
  if (!validation.success) {
    const firstError = validation.error.errors[0]?.message || 'Datos inválidos.';
    logger.warn('[registerReferral] Validación Zod fallida:', { error: firstError });
    return { success: false, error: firstError };
  }

  const { tuNumero: cleanTuNumero, suNumero: cleanSuNumero } = validation.data;

  try {
    getAdminApp();
    const db = getFirestore();

    // ── 4. Verificación VIP: el referidor debe ser cliente activo ────────────
    const referrerSnapshot = await db
      .collection('consultations')
      .where('contacto', '==', cleanTuNumero)
      .get();

    if (referrerSnapshot.empty) {
      return {
        success: false,
        error:
          'Tu número no está registrado. Debes tener una consulta previa en Desmulta para acceder a los beneficios VIP.',
      };
    }

    const isVerifiedClient = referrerSnapshot.docs.some((doc) => doc.data().status !== 'pendiente');

    if (!isVerifiedClient) {
      return {
        success: false,
        error:
          'Tu consulta aún está pendiente de revisión. Podrás referir amigos una vez que un especialista haya contactado o procesado tu caso.',
      };
    }

    // ── 5. FIX NUEVO: Verificar que el referido no sea ya cliente ────────────
    // Si el número que quieres referir ya tiene consultas activas, el referido
    // no tiene valor comercial y generaría reclamos de comisión injustificados.
    const referredExistingSnapshot = await db
      .collection('consultations')
      .where('contacto', '==', cleanSuNumero)
      .get();

    if (!referredExistingSnapshot.empty) {
      const referredIsActive = referredExistingSnapshot.docs.some(
        (doc) => doc.data().status !== 'pendiente'
      );
      if (referredIsActive) {
        return {
          success: false,
          error:
            'El número que intentas referir ya tiene una consulta activa en Desmulta. Solo puedes referir personas que aún no hayan iniciado su trámite.',
        };
      }
    }

    // ── 6. FIX NUEVO: Detección de referidos duplicados ─────────────────────
    // Evita que el mismo referidor envíe el mismo número varias veces.
    const duplicateSnapshot = await db
      .collection('referidos')
      .where('tuNumero', '==', cleanTuNumero)
      .where('suNumero', '==', cleanSuNumero)
      .get();

    if (!duplicateSnapshot.empty) {
      return {
        success: false,
        error:
          'Ya registraste una referencia para ese número. Te avisaremos cuando tu referido inicie su trámite.',
      };
    }

    // ── 7. Persistencia en Firestore ─────────────────────────────────────────
    const docRef = db.collection('referidos').doc();

    await docRef.set({
      tuNumero: cleanTuNumero,
      suNumero: cleanSuNumero,
      createdAt: Timestamp.now(),
      status: 'pendiente',
      updatedAt: Timestamp.now(),
      source: 'web_vip', // Trazabilidad: origen del referido
    });

    logger.info('Referido VIP registrado con éxito', {
      referralId: docRef.id,
      referrerPhone: cleanTuNumero.substring(0, 3) + '***' + cleanTuNumero.substring(7),
      referredPhone: cleanSuNumero.substring(0, 3) + '***' + cleanSuNumero.substring(7),
    });

    return { success: true };
  } catch (error) {
    logger.error('Error registrando referido VIP en Firestore:', { error: String(error) });
    return { success: false, error: 'Ocurrió un error en el servidor. Inténtalo de nuevo.' };
  }
}
