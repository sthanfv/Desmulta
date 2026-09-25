import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';
import { getHealthReport } from '@/lib/monitoring/health';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

/**
 * GET /api/health — ruta pública para el monitor externo de disponibilidad.
 * 200 si el sitio y Firestore responden; 503 si Firestore falla.
 * Exenta del geobloqueo en `src/middleware.ts` (los monitores revisan desde fuera de Colombia).
 * Ver `docs/GUIA_INCIDENTES.md`.
 */
export async function GET() {
  const report = await getHealthReport(() =>
    getFirestore(getAdminApp()).collection('metadata').doc('counters').get()
  );
  return NextResponse.json(report, {
    status: report.status === 'ok' ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}

/** HEAD: algunos monitores solo piden cabeceras. */
export async function HEAD() {
  const res = await GET();
  return new NextResponse(null, { status: res.status, headers: res.headers });
}
