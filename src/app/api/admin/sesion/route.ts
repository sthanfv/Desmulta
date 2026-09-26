import { NextResponse } from 'next/server';

/**
 * GET /api/admin/sesion — "latido" del panel.
 *
 * No hace nada por sí mismo: el middleware ya validó el token 2FA (15 min de inactividad,
 * 8 h en total) y, si está vigente, renovó la última actividad. El panel lo llama mientras
 * el operador está activo aunque no haga otras peticiones (ver CierrePorInactividad.tsx).
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
