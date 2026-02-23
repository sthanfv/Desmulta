import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Mapa en memoria para el rate limiting simple (Nota: En Vercel Serverless esto es por instancia)
// Para una solución definitiva en producción Vercel, se recomienda Upstash o Redis.
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

const RATE_LIMIT_THRESHOLD = 10; // Máximo 10 peticiones
const RATE_LIMIT_WINDOW = 60 * 1000; // Por minuto (60,000 ms)

export function middleware(request: NextRequest) {
    const ip = (request as any).ip ?? request.headers.get('x-forwarded-for') ?? '127.0.0.1';

    // Solo aplicar rate limiting a rutas críticas (API de contacto y formularios)
    if (request.nextUrl.pathname.startsWith('/api/create-consultation') || request.nextUrl.pathname.startsWith('/api/notify')) {
        const now = Date.now();
        const rateLimitInfo = rateLimitMap.get(ip) ?? { count: 0, lastReset: now };

        if (now - rateLimitInfo.lastReset > RATE_LIMIT_WINDOW) {
            rateLimitInfo.count = 1;
            rateLimitInfo.lastReset = now;
        } else {
            rateLimitInfo.count++;
        }

        rateLimitMap.set(ip, rateLimitInfo);

        if (rateLimitInfo.count > RATE_LIMIT_THRESHOLD) {
            return new NextResponse('Demasiadas peticiones. Por favor, intente más tarde.', {
                status: 429,
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Retry-After': '60',
                },
            });
        }
    }

    // Continuar con el resto de la petición
    const response = NextResponse.next();

    // Asegurar que los headers de seguridad se mantienen (aunque Next.js ya los inyecta vía config)
    return response;
}

// Configuración de rutas donde se ejecuta el middleware
export const config = {
    matcher: ['/api/create-consultation', '/api/notify'],
};
