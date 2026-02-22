import { NextResponse } from 'next/server';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';
import { ConsultationSchema } from '@/lib/definitions';

// Inicializar Firebase Admin SDK via singleton seguro
try {
  getAdminApp();
} catch (error) {
  const message = error instanceof Error ? error.message : 'Error desconocido';
  console.error('[firebase-admin] Error de inicialización:', message);
}

export async function POST(request: Request) {
  // getAdminApp() garantiza que la app esté inicializada antes de usar servicios
  getAdminApp();
  const db = getFirestore();

  try {
    const rawBody = await request.text();

    if (!rawBody) {
      console.error('[create-consultation] Cuerpo de la petición vacío.');
      return NextResponse.json({ error: 'Cuerpo de la petición vacío.' }, { status: 400 });
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      console.error('[create-consultation] Error al parsear JSON.');
      return NextResponse.json({ error: 'Formato JSON inválido.' }, { status: 400 });
    }

    // 1. Validar input contra el schema Zod
    const validation = ConsultationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos de entrada no válidos.', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { cedula, nombre, contacto, aceptoTerminos, authorUid } = validation.data;

    if (!authorUid) {
      return NextResponse.json({ error: 'Falta el UID del autor.' }, { status: 400 });
    }

    // 2. Rate Limiting Check
    const cooldownRef = db.collection('consultationCooldowns').doc(authorUid);
    const cooldownSnap = await cooldownRef.get();
    const fiveMinutes = 5 * 60 * 1000;

    if (cooldownSnap.exists) {
      const lastAttempt = (cooldownSnap.data()?.lastAttemptAt as Timestamp).toMillis();
      if (Date.now() - lastAttempt < fiveMinutes) {
        return NextResponse.json(
          { error: 'Límite de envíos alcanzado. Por favor, espere 5 minutos.' },
          { status: 429 }
        );
      }
    }

    // 3. Preparar datos para Firestore
    const dataToSave = {
      authorUid,
      cedula,
      nombre,
      contacto,
      aceptoTerminos,
      status: 'pendiente' as const,
      fuente: 'web' as const,
      createdAt: FieldValue.serverTimestamp(),
      notificationStatus: 'pending' as const,
    };

    // 4. Transacción atómica: escribir consulta + actualizar cooldown
    const consultationRef = db.collection('consultations').doc();

    await db.runTransaction(async (transaction) => {
      transaction.set(consultationRef, dataToSave);
      transaction.set(cooldownRef, { lastAttemptAt: FieldValue.serverTimestamp() });
    });

    // 5. Disparar notificación (fire-and-forget)
    // ✅ SSRF FIX: URL construida desde variable de entorno, NUNCA del header Host del request.
    // Un atacante podría manipular el header Host para redirigir el fetch a un servidor malicioso.
    // Usamos NEXT_PUBLIC_SITE_URL configurada en el entorno de servidor.
    const baseUrl =
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:9005'
        : process.env.NEXT_PUBLIC_SITE_URL;

    if (baseUrl) {
      const notifyUrl = `${baseUrl}/api/notify`;
      const internalSecret = process.env.INTERNAL_API_SECRET || '';

      fetch(notifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Secreto interno: /api/notify rechazará llamados sin este header
          'x-internal-secret': internalSecret,
        },
        body: JSON.stringify({ docId: consultationRef.id }),
      }).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        console.error('[create-consultation] Error disparando notify:', msg);
      });
    } else {
      console.error(
        '[create-consultation] NEXT_PUBLIC_SITE_URL no está configurado. Notificación omitida.'
      );
    }

    return NextResponse.json({ success: true, docId: consultationRef.id }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error('[create-consultation] Error interno:', message);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
