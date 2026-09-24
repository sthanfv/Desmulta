import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { getTokens } from 'next-firebase-auth-edge/lib/next/tokens';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';
import { getDemandTopicLabel } from '@/lib/analytics/demand-tracker';
import { logger } from '@/lib/logger/security-logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Evita el caché en Vercel para datos en vivo

export async function GET(request: NextRequest) {
  try {
    // 1. Verificación de Autenticación de Administrador
    const tokens = await getTokens(request.cookies, {
      cookieName: '__session',
      cookieSignatureKeys: [
        process.env.AUTH_COOKIE_SIGNATURE_KEY_CURRENT || '',
        process.env.AUTH_COOKIE_SIGNATURE_KEY_PREVIOUS || '',
      ],
      serviceAccount: {
        projectId:
          process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      },
      apiKey:
        process.env.NEXT_PUBLIC_BASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    });

    if (!tokens) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    getAdminApp();
    const db = getFirestore();
    const adminDoc = await db.collection('admins').doc(tokens.decodedToken.uid).get();

    if (!adminDoc.exists || adminDoc.data()?.disabled) {
      return NextResponse.json({ error: 'Acceso Denegado' }, { status: 403 });
    }

    // 2. Conexión Upstash Redis
    const redis = Redis.fromEnv();
    const date = new Date();
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    // 3. Obtener Data de Redis usando Pipeline
    const pipeline = redis.pipeline();
    pipeline.get(`analytics:demand:total:${monthKey}`);
    pipeline.hgetall(`analytics:demand:topics:${monthKey}`);
    pipeline.hgetall(`analytics:demand:cities:${monthKey}`);

    const [totalStr, topicsHash, citiesHash] = (await pipeline.exec()) as [
      string | null,
      Record<string, string> | null,
      Record<string, string> | null,
    ];

    const totalQueries = totalStr ? parseInt(totalStr, 10) : 0;

    // 4. Transformar los Hashes a Arrays y calcular porcentajes
    const topics = topicsHash
      ? Object.entries(topicsHash)
          .map(([id, count]) => {
            const cnt = parseInt(count, 10);
            return {
              id,
              label: getDemandTopicLabel(id),
              count: cnt,
              percentage: totalQueries > 0 ? Number(((cnt / totalQueries) * 100).toFixed(1)) : 0,
            };
          })
          .sort((a, b) => b.count - a.count)
      : [];

    const cities = citiesHash
      ? Object.entries(citiesHash)
          .map(([city, count]) => {
            const cnt = parseInt(count, 10);
            return {
              city: city.charAt(0).toUpperCase() + city.slice(1),
              count: cnt,
              percentage: totalQueries > 0 ? Number(((cnt / totalQueries) * 100).toFixed(1)) : 0,
            };
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
      : []; // Top 5 ciudades

    // 5. Retornar el informe JSON consolidado
    return NextResponse.json({
      month: monthKey,
      totalQueries,
      topics,
      cities,
    });
  } catch (error) {
    logger.error('[API Admin] Error cargando analítica de demanda:', error);
    return NextResponse.json({ error: 'Error interno obteniendo analítica' }, { status: 500 });
  }
}
