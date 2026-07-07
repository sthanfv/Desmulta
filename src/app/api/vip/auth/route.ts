import { NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { hashPII } from '@/lib/security/server-crypto';
import { sendOtpSms } from '@/lib/notifications/sms-provider';
import { generateOtp, storeOtpChallenge } from '@/lib/security/vip-otp-service';

import { rateLimit } from '@/lib/security/rate-limit';
import { logger } from '@/lib/logger/security-logger';

export async function POST(request: Request) {
  try {
    // 1. Rate Limiting por IP
    const ip = request.headers.get('x-forwarded-for') || 'unknown';

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

    // 3. Generar y enviar OTP (FIX: Hallazgo 7)
    const otp = generateOtp();
    await storeOtpChallenge(hashedCedula, otp, hashedCelular);
    
    // El SMS se debe enviar al celular registrado, que coincide con el proporcionado.
    // Como normalizedCelular fue verificado, lo usamos.
    await sendOtpSms(normalizedCelular, otp);

    return NextResponse.json(
      { success: true, step: 'otp_required' },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Error en autenticación VIP', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
