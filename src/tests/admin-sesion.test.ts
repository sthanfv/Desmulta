// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { verifyAdminToken } from '@/lib/auth/admin-jwt';
import {
  ABSOLUTO_MS,
  INACTIVIDAD_MS,
  evaluarSesion2fa,
  firmarSesion2fa,
} from '@/lib/auth/admin-sesion';

/**
 * Política de sesión del panel: 15 min de inactividad y 8 h absolutas, exigidas por el servidor
 * (el middleware usa estas funciones en cada página y llamada del panel).
 */
describe('Sesión del panel — inactividad y límite absoluto', () => {
  beforeAll(() => {
    process.env.GOD_MODE_JWT_SECRET ||= 'secreto-de-pruebas-de-al-menos-32-caracteres!!';
  });

  const minuto = 60 * 1000;

  it('un token recién emitido es válido y no necesita renovarse', async () => {
    const ahora = Date.now();
    const payload = await verifyAdminToken(await firmarSesion2fa('uid-1', { ahora }), 'admin-2fa');
    expect(payload?.uid).toBe('uid-1');
    expect(evaluarSesion2fa(payload!, ahora)).toEqual({ valida: true, renovar: false, ini: ahora });
  });

  it('con más de 1 min sin uso se renueva, y a los 15 min se cierra por inactividad', async () => {
    const ahora = Date.now();
    const payload = (await verifyAdminToken(
      await firmarSesion2fa('uid-1', { ahora }),
      'admin-2fa'
    ))!;
    expect(evaluarSesion2fa(payload, ahora + 2 * minuto)).toMatchObject({
      valida: true,
      renovar: true,
    });
    expect(evaluarSesion2fa(payload, ahora + INACTIVIDAD_MS + 1000)).toEqual({
      valida: false,
      motivo: 'inactividad',
    });
  });

  it('renovar conserva el inicio: la actividad no extiende las 8 h', async () => {
    const ahora = Date.now();
    const ini = ahora - 2 * 60 * minuto;
    const renovado = (await verifyAdminToken(
      await firmarSesion2fa('uid-1', { ini, ahora }),
      'admin-2fa'
    ))!;
    expect(renovado.ini).toBe(ini);
    expect(renovado.act).toBe(ahora);
    expect(evaluarSesion2fa({ ...renovado }, ini + ABSOLUTO_MS + 1000)).toEqual({
      valida: false,
      motivo: 'vencida',
    });
  });

  it('un token de antes de este control (sin marcas de tiempo) pide entrar de nuevo', () => {
    expect(evaluarSesion2fa({ uid: 'uid-1', role: 'admin' })).toEqual({
      valida: false,
      motivo: 'antigua',
    });
  });
});
