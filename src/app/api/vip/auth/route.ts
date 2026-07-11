import { NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { hashPII } from '@/lib/security/server-crypto';

import { rateLimit } from '@/lib/security/rate-limit';
import { logger } from '@/lib/logger/security-logger';

export async function POST(request: Request) {
  try {
    const { getSecureIp } = await import('@/lib/security/ip-utils');
    const ip = getSecureIp(request);

    const rlResult = await rateLimit(`vip-auth:${ip}`, 5, 15 * 60 * 1000);
    if (!rlResult.success) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Intente más tarde.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(rlResult.reset / 1000)),
          },
        }
      );
    }

    const { cedula, celular } = await request.json();

    if (!cedula || !celular) {
      return NextResponse.json({ error: 'Cédula y Celular son requeridos' }, { status: 400 });
    }

    // Normalizar datos (quitar espacios, etc)
    const normalizedCedula = cedula.trim().replace(/\D/g, '');
    const normalizedCelular = celular.trim().replace(/\D/g, '');

    if (normalizedCedula.length < 5 || normalizedCelular.length < 10) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 400 });
    }

    const hashedCedula = hashPII(normalizedCedula);
    const hashedCelular = hashPII(normalizedCelular);

    // 1.5. Rate Limiting por Cédula (defensa en profundidad)
    const rlCedula = await rateLimit(`vip-auth-cedula:${hashedCedula}`, 5, 15 * 60 * 1000);
    if (!rlCedula.success) {
      return NextResponse.json(
        { error: 'Demasiados intentos para esta cédula. Intente más tarde.' },
        { status: 429 }
      );
    }

    // 2. Verificar existencia en Firestore (Casos o Consultas)
    getAdminApp();
    const db = getFirestore();

    // Primero buscamos en casos (más relevante)
    const casesSnapshot = await db
      .collection('cases')
      .where('cedulaHash', '==', hashedCedula)
      .limit(5)
      .get();

    // Segundo buscamos en leads
    const leadsSnapshot = await db
      .collection('consultations')
      .where('cedulaHash', '==', hashedCedula)
      .limit(5)
      .get();

    // Comprobar coincidencia exacta con celular
    let isValidUser = false;

    const checkCelular = (doc: QueryDocumentSnapshot) => {
      const data = doc.data();
      if (!data.contacto) return false;
      // \ud83d\udee1\ufe0f SOLO comparaci\u00f3n por hash HMAC — Zero-PII estricto.
      // El fallback en texto plano fue eliminado porque permit\u00eda enumeraci\u00f3n
      // por timing side-channel y anulaba la protecci\u00f3n Zero-PII del campo contacto.
      // Los documentos anteriores a la migraci\u00f3n deben procesarse con el script de migraci\u00f3n.
      return data.contactoHash === hashedCelular;
    };

    casesSnapshot.forEach((doc) => {
      if (checkCelular(doc)) isValidUser = true;
    });

    if (!isValidUser) {
      leadsSnapshot.forEach((doc) => {
        if (checkCelular(doc)) isValidUser = true;
      });
    }

    if (!isValidUser) {
      return NextResponse.json(
        { error: 'No se encontraron expedientes con esa combinación de Cédula y Celular.' },
        { status: 401 }
      );
    }

    // 🛡️ Tras probar coincidencia de Cédula y Celular, emitimos la sesión directamente
    const { signVipSession } = await import('@/lib/security/vip-jwt');
    const sessionToken = await signVipSession({
      hashedCedula,
      hashedCelular,
    });

    const response = NextResponse.json(
      { success: true, redirect: '/vip/dashboard' },
      { status: 200 }
    );

    response.cookies.set({
      name: '_vip_session',
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 días
    });

    return response;
  } catch (error) {
    logger.error('Error en autenticación VIP', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
