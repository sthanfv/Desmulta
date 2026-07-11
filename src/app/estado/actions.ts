'use server';

/**
 * 🛡️ Portal de Estado — Server Actions
 *
 * Seguridad aplicada (ADR-001 Zero-PII):
 *  - Cédula y contacto se hashean con HMAC-SHA256 antes de consultar Firestore.
 *    Firestore NUNCA recibe PII en texto claro desde esta acción.
 *  - Delay mínimo constante de 300 ms en TODOS los paths para neutralizar
 *    timing attacks (enumeración de cédulas por diferencial de tiempo).
 *  - Rate-limit: máx 5 intentos por IP por hora (en memoria, compatible con Edge).
 */

import { cookies, headers } from 'next/headers';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { hashPII, signPortalSession } from '@/lib/security/server-crypto';
import { z } from 'zod';
import { rateLimit } from '@/lib/security/rate-limit';

/** Tiempo mínimo garantizado de respuesta (ms) — mitiga timing attacks */
const MIN_RESPONSE_MS = 300;

/** Pausa que asegura el tiempo mínimo de respuesta */
const minDelay = () => new Promise<void>((res) => setTimeout(res, MIN_RESPONSE_MS));

/** Duración de la cookie de sesión del portal (4 horas en segundos) */
const PORTAL_COOKIE_MAX_AGE = 4 * 60 * 60;

const AuthSchema = z.object({
  cedula: z.string().optional().or(z.literal('')),
  contacto: z
    .string()
    .regex(
      /^3(0[0-5]|1[0-9]|2[0-4]|5[01])[0-9]{7}$/,
      'Debe ser un número de celular válido en Colombia'
    ),
});

/**
 * Autentica al cliente usando su Cédula y Teléfono.
 * Nunca almacena ni transmite PII en texto claro a Firestore.
 * Siempre responde en ≥ MIN_RESPONSE_MS ms (anti-timing-attack).
 * Rate-limit: máx 5 intentos / IP / hora.
 */
export async function loginClientPortal(
  formData: FormData
): Promise<{ success: boolean; trackingUuid?: string; error?: string }> {
  // Ejecutar la lógica real y el delay en paralelo.
  // La función siempre tardará al menos MIN_RESPONSE_MS, sin importar el path.
  const [result] = await Promise.all([_authenticate(formData), minDelay()]);

  // 🔐 Si la autenticación fue exitosa, emitir cookie de sesión firmada.
  // La cookie es HttpOnly (invisible a JS), SameSite=Strict y Secure en producción.
  // El guard del middleware en /seguir/** la valida en cada request.
  if (result.success && result.trackingUuid) {
    const token = await signPortalSession(result.trackingUuid);
    const cookieStore = await cookies();
    cookieStore.set('_portal_session', token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: PORTAL_COOKIE_MAX_AGE,
      path: '/seguir',
    });
  }

  return result;
}

/** Lógica interna de autenticación — envuelta por loginClientPortal */
async function _authenticate(
  formData: FormData
): Promise<{ success: boolean; trackingUuid?: string; error?: string }> {
  try {
    const headersList = await headers();
    const { getSecureIp } = await import('@/lib/security/ip-utils');
    const ip = getSecureIp(headersList);

    const rl = await rateLimit(`estado_login_${ip}`, 5, 60 * 60 * 1000);
    if (!rl.success) {
      const mins = Math.ceil(rl.reset / 60000);
      return {
        success: false,
        error: `Demasiados intentos. Vuelva a intentar en ${mins} minuto${mins !== 1 ? 's' : ''}.`,
      };
    }

    // 🛡️ WORKAROUND Next.js 15 RPC: Si formData se serializó como plain object, usar acceso directo
    const plainForm = formData as unknown as Record<string, unknown>;
    const cedulaRaw =
      typeof formData.get === 'function' ? formData.get('cedula') : plainForm.cedula;
    const contactoRaw =
      typeof formData.get === 'function' ? formData.get('contacto') : plainForm.contacto;

    const cedula = (cedulaRaw as string)?.replace(/\s+/g, '');
    const contacto = (contactoRaw as string)?.replace(/\s+/g, '');

    const validation = AuthSchema.safeParse({ cedula, contacto });
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message };
    }

    // 🛡️ ADR-001: Hashear PII antes de consultar Firestore
    const cedulaInput = validation.data.cedula || '';
    const contactoHash = hashPII(validation.data.contacto);

    getAdminApp();
    const db = getFirestore();

    let consultSnap;

    // Buscar por hashes — Firestore nunca recibe cédula ni teléfono en texto claro
    if (cedulaInput.length >= 5) {
      const cedulaHash = hashPII(cedulaInput);
      consultSnap = await db
        .collection('consultations')
        .where('cedulaHash', '==', cedulaHash)
        .where('contactoHash', '==', contactoHash)
        .limit(1)
        .get();
    } else {
      // Si no hay cédula, solo permitimos buscar casos de SIMIT (que no tienen cédula)
      consultSnap = await db
        .collection('consultations')
        .where('contactoHash', '==', contactoHash)
        .where('fuente', '==', 'simit_capture')
        .limit(1)
        .get();
    }

    if (consultSnap.empty) {
      return { success: false, error: 'No encontramos expedientes asociados a estos datos.' };
    }

    const consultData = consultSnap.docs[0].data();
    const trackingUuid = consultData.trackingUuid as string | undefined;

    if (!trackingUuid) {
      return {
        success: false,
        error: 'El expediente aún no tiene portal de seguimiento asignado.',
      };
    }

    return { success: true, trackingUuid };
  } catch (_error) {
    console.error('DEBUG_LOGIN_ERROR:', _error);
    const msg = _error instanceof Error ? _error.message : String(_error);
    return { success: false, error: `Error interno de conexión. Detalle: ${msg}` };
  }
}
