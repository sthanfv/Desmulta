import { NextResponse } from 'next/server';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';

// Helper function to escape markdown characters for Telegram
function escapeMarkdown(text: string): string {
  if (!text) return '';
  // Escape characters: _ * [ ] ( ) ~ ` > # + - = | { } . !
  const charsToEscape = '_*[]()~`>#+-=|{}.!';
  return text.replace(new RegExp(`([${charsToEscape.split('').join('\\')}])`, 'g'), '\\$1');
}

// Helper function to initialize Firebase Admin
function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    return;
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
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error: any) {
    throw new Error(
      `Error de inicialización de Firebase Admin: ${error.message}. Verifique el formato de la clave.`
    );
  }
}

export async function POST(request: Request) {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('Telegram environment variables are not configured.');
    return NextResponse.json(
      { error: 'Server configuration error.', details: 'Telegram Bot Token or Chat ID not set.' },
      { status: 500 }
    );
  }

  try {
    initializeFirebaseAdmin();
    const db = getFirestore();

    const body = await request.json();
    const { docId } = body;

    if (!docId) {
      return NextResponse.json(
        { success: false, error: 'Document ID is required.' },
        { status: 400 }
      );
    }

    const docRef = db.collection('consultations').doc(docId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'No existe el documento de consulta.' }, { status: 404 });
    }

    const data = docSnap.data();

    // Idempotency Check: If notification was already sent, do nothing.
    if (data?.notificationStatus === 'sent') {
      return NextResponse.json({ message: 'Notificación ya fue enviada.' });
    }

    // A more professional and secure message format using MarkdownV2
    const message = `
🚨 *Nueva Consulta Gratuita* 🚨
\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_
*Nombre:* ${escapeMarkdown(data?.nombre)}
*Cédula:* ${escapeMarkdown(data?.cedula)}
*Contacto:* \\+${escapeMarkdown(data?.contacto)}
*ID Consulta:* \`${escapeMarkdown(docId)}\`
\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_
*Fecha Recepción:* ${escapeMarkdown(new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }))}
`;

    const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    const telegramResponse = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'MarkdownV2',
      }),
    });

    if (!telegramResponse.ok) {
      const errorData = await telegramResponse.json();
      console.error('Telegram API Error:', errorData);
      // Do not return a critical error to the main client flow if only Telegram fails.
      // The consultation is saved; this can be retried or monitored.
      return NextResponse.json(
        { error: 'Telegram API call failed but consultation was saved.', details: errorData },
        { status: 200 }
      );
    }

    // Mark as notified to ensure idempotency
    await docRef.update({
      notificationStatus: 'sent',
      notifiedAt: Timestamp.now(),
    });

    return NextResponse.json({ success: true, message: 'Notificación enviada.' });
  } catch (error: any) {
    console.error('Error in /api/notify:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor.', details: error.message },
      { status: 500 }
    );
  }
}
