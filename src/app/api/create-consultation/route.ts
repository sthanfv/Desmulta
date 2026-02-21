import { NextResponse } from 'next/server';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';
import { ConsultationSchema } from '@/lib/definitions';

// Inicializar Firebase Admin SDK via singleton seguro
try {
  getAdminApp();
} catch (error) {
  console.error('[firebase-admin] Error de inicialización:', error);
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

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('[create-consultation] Error al parsear JSON:', rawBody.substring(0, 100));
      return NextResponse.json({ error: 'Formato JSON inválido.' }, { status: 400 });
    }

    // 1. Validate input data against schema
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

    // 3. Prepare data for Firestore
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

    // 4. Use a transaction to write consultation and update cooldown atomically
    const consultationRef = db.collection('consultations').doc(); // Create a new doc ref

    await db.runTransaction(async (transaction) => {
      transaction.set(consultationRef, dataToSave);
      transaction.set(cooldownRef, { lastAttemptAt: FieldValue.serverTimestamp() });
    });

    // 5. Trigger notification (fire-and-forget)
    // We don't await this so the client gets a faster response.
    // Construimos la URL base dinámicamente para que funcione tanto en localhost como en prod.
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const host = request.headers.get('host') || 'localhost:3000';
    const notifyUrl = `${protocol}://${host}/api/notify`;

    fetch(notifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docId: consultationRef.id }),
    }).catch((err) => console.error('[create-consultation] Error disparando notify:', err.message));

    return NextResponse.json({ success: true, docId: consultationRef.id }, { status: 201 });
  } catch (error: any) {
    console.error('Error in /api/create-consultation:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
