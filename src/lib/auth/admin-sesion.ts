/**
 * Política de sesión del panel de administración (OWASP Session Management / NIST 800-63B).
 *
 * El token `admin-2fa-token` lleva dos marcas de tiempo:
 *   - `ini`: cuándo se verificó el código (límite ABSOLUTO de 8 h, aunque haya actividad);
 *   - `act`: última actividad (límite de INACTIVIDAD de 15 min).
 * El middleware las revisa en cada página y llamada del panel y, si todo está bien, renueva
 * `act` (como máximo una vez por minuto). La cookie es "de sesión" (sin maxAge): se borra al
 * cerrar el navegador. La parte visible (aviso y cierre en todas las pestañas) está en
 * `src/components/admin/CierrePorInactividad.tsx`.
 */
import type { JWTPayload } from 'jose';
import { signAdminToken } from './admin-jwt';

export const INACTIVIDAD_MS = 15 * 60 * 1000;
export const ABSOLUTO_MS = 8 * 60 * 60 * 1000;
export const RENOVAR_CADA_MS = 60 * 1000;
export const COOKIE_2FA = 'admin-2fa-token';

/** Opciones de la cookie 2FA: HttpOnly, estricta y de sesión (sin maxAge). */
export const OPCIONES_COOKIE_2FA = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};

/** Firma el token 2FA. `ini` se conserva al renovar para no extender el límite absoluto. */
export async function firmarSesion2fa(
  uid: string,
  { ini, ahora = Date.now() }: { ini?: number; ahora?: number } = {}
): Promise<string> {
  const inicio = ini ?? ahora;
  const restanteSeg = Math.max(1, Math.floor((inicio + ABSOLUTO_MS - ahora) / 1000));
  return signAdminToken(
    'admin-2fa',
    { uid, role: 'admin', ini: inicio, act: ahora },
    `${restanteSeg}s`
  );
}

export type MotivoCierre = 'inactividad' | 'vencida' | 'antigua';

/** ¿La sesión sigue viva? ¿Toca renovar la actividad? */
export function evaluarSesion2fa(
  payload: JWTPayload,
  ahora = Date.now()
): { valida: true; renovar: boolean; ini: number } | { valida: false; motivo: MotivoCierre } {
  const ini = typeof payload.ini === 'number' ? payload.ini : null;
  const act = typeof payload.act === 'number' ? payload.act : null;
  // Tokens emitidos antes de este control: se pide entrar de nuevo (una sola vez).
  if (ini === null || act === null) return { valida: false, motivo: 'antigua' };
  if (ahora - ini > ABSOLUTO_MS) return { valida: false, motivo: 'vencida' };
  if (ahora - act > INACTIVIDAD_MS) return { valida: false, motivo: 'inactividad' };
  return { valida: true, renovar: ahora - act >= RENOVAR_CADA_MS, ini };
}
