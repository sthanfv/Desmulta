import { NextResponse } from 'next/server';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { z } from 'zod';

// Simplified schema for server-side validation. Does not include `authorUid`.
const ApiConsultationSchema = z.object({
  cedula: z.string().min(5, 'La cédula es muy corta.').max(20, 'La cédula es muy larga.'),
  nombre: z.string().trim().min(3, 'El nombre es requerido.').max(60, 'El nombre es muy largo.'),
  contacto: z.string().regex(/^3[0-9]{9}$/, 'Debe ser un número de celular válido.'),
  aceptoTerminos: z.literal(true, { errorMap: () => ({ message: 'Debe aceptar los términos.' }) }),
  website: z.string().max(0, 'Detección de bot.').optional(), // Honeypot
});

// Helper function to initialize Firebase Admin, throwing a specific error on failure.
function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    return; // Already initialized, do nothing.
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error(
      'Error de configuración del servidor: La clave privada de Firebase no está disponible.'
    );
  }

  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // This line correctly handles the single-line format with \n characters from .env
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error: any) {
    // Re-throw a more specific error to be caught and returned as JSON
    throw new Error(
      `Error de inicialización de Firebase Admin: ${error.message}. Verifique el formato de la clave privada.`
    );
  }
}

export async function POST(request: Request) {
  try {
    // This function will throw if initialization fails, which will be caught below.
    initializeFirebaseAdmin();
    const db = getFirestore();

    const body = await request.json();

    // Server-side validation
    const validation = ApiConsultationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos de entrada no válidos.', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Honeypot check
    if (validation.data.website) {
      return NextResponse.json({ success: true }); // Silently succeed and do nothing for bots
    }

    const { cedula, nombre, contacto, aceptoTerminos } = validation.data;

    const dataToSave = {
      cedula,
      nombre,
      contacto,
      aceptoTerminos,
      status: 'pendiente' as const,
      fuente: 'web' as const,
      createdAt: FieldValue.serverTimestamp(),
      notificationStatus: 'pending' as const,
    };

    // Create the document using the Admin SDK
    const consultationRef = await db.collection('consultations').add(dataToSave);

    // Trigger the notification route in a non-blocking way
    fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docId: consultationRef.id }),
    }).catch(console.error); // Log any error from the notification call but don't fail the main request

    return NextResponse.json({ success: true, docId: consultationRef.id }, { status: 201 });
  } catch (error: any) {
    console.error('Error en /api/create-consultation:', error.message);
    // Return a clear JSON response for any error, including initialization failure
    return NextResponse.json(
      { error: 'Error interno del servidor.', details: error.message },
      { status: 500 }
    );
  }
}
