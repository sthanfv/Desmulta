import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger/security-logger';
import { rateLimit } from '@/lib/security/rate-limit';
import { getAdminApp } from '@/lib/firebase-admin';
import { timingSafeEqual } from 'crypto';

const CrashPayloadSchema = z.object({
  // 🛡️ FIX H-4: límites estrictos para prevenir payloads abusivos
  message: z
    .string()
    .max(2000, 'El mensaje no puede superar 2000 caracteres.')
    .default('(sin mensaje)'),
  stack: z.string().max(3000).optional(),
  componentStack: z.string().max(3000).optional(),
  digest: z.string().max(100).optional(),
  path: z.string().max(512, 'La ruta no puede superar 512 caracteres.').default('/'),
});

const MAX_REQUESTS_PER_WINDOW = 50;
const WINDOW_MS = 60 * 1000; // 1 minuto por IP

function escapeHTML(text: string): string {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function POST(req: Request) {
  try {
    // 🛡️ F-04 DEVSECOPS: Autenticación del endpoint interno
    const authHeader = req.headers.get('x-internal-secret');
    const internalSecret = process.env.CRASH_REPORT_SECRET;

    if (!internalSecret) {
      logger.error('[crash-report] CRASH_REPORT_SECRET no configurada en servidor');
      return new NextResponse('Unauthorized', { status: 500 });
    }

    const expected = Buffer.from(internalSecret);
    const expectedLength = expected.length;
    const providedBuffer = Buffer.alloc(expectedLength);
    providedBuffer.write(authHeader ?? '');

    const isLengthEqual = (authHeader ?? '').length === expectedLength;
    const isSecretMatch = timingSafeEqual(providedBuffer, expected);

    if (!isLengthEqual || !isSecretMatch) {
      logger.warn('[crash-report] Intento de acceso no autorizado a crash-report (firma inválida)');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { getSecureIp } = await import('@/lib/security/ip-utils');
    const ip = getSecureIp(req);
    const safeIpId = ip.replace(/[^a-zA-Z0-9]/g, '_');

    const rl = await rateLimit(
      `crash_report:${safeIpId}`,
      MAX_REQUESTS_PER_WINDOW,
      WINDOW_MS,
      'crash_reports_cooldown'
    );
    if (!rl.success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Payload JSON inválido' }, { status: 400 });
    }

    const result = CrashPayloadSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Esquema inválido' }, { status: 400 });
    }

    const data = result.data;
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    const processCrashReport = async () => {
      // 1. Guardar en Firestore
      try {
        const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
        const db = getFirestore(getAdminApp());
        await db.collection('crash_reports').add({
          message: data.message,
          digest: data.digest || 'N/A',
          path: data.path,
          ip: ip,
          timestamp: FieldValue.serverTimestamp(),
          // 🛡️ FIX H-4: truncar userAgent para evitar almacenamiento de cabeceras abusivas
          userAgent: userAgent.substring(0, 300),
        });
      } catch (dbErr) {
        logger.error('[crash-report] Error guardando en Firestore', { err: String(dbErr) });
      }

      // 2. Notificar al NOC unificado vía security-logger
      logger.error('Fallo Crítico de Frontend (Pantalla Rota)', {
        traceId: data.digest || 'FRONTEND-CRASH',
        endpoint: data.path,
        userAgent: userAgent.substring(0, 300),
        error: data.message,
        payload: {
          stack: data.stack,
          componentStack: data.componentStack,
        }
      });
    };

    import('@vercel/functions')
      .then(({ waitUntil }) => {
        waitUntil(processCrashReport());
      })
      .catch(() => {
        processCrashReport();
      });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error('[crash-report] Error no controlado:', { error: String(error) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
