import { NextResponse } from 'next/server';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';

// Helper function to escape HTML characters for Telegram
function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Inicializar Firebase Admin SDK via singleton seguro
try {
  getAdminApp();
} catch (error) {
  console.error('[firebase-admin] Error de inicialización:', error);
}

export async function POST(request: Request) {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('Telegram environment variables are not configured.');
    return NextResponse.json(
      { success: false, error: 'Server configuration error.' },
      { status: 500 }
    );
  }

  try {
    const rawBody = await request.text();

    if (!rawBody) {
      console.error('[notify] Cuerpo de la petición vacío.');
      return NextResponse.json({ success: false, error: 'Cuerpo de la petición vacío.' }, { status: 400 });
    }

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('[notify] Error al parsear JSON:', rawBody.substring(0, 100));
      return NextResponse.json({ success: false, error: 'Formato JSON inválido.' }, { status: 400 });
    }

    const { docId } = body;

    if (!docId) {
      return NextResponse.json(
        { success: false, error: 'Document ID is required.' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    const docRef = db.collection('consultations').doc(docId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'No existe el documento de consulta.' }, { status: 404 });
    }

    const data = docSnap.data();

    // Idempotencia: Si la notificación ya fue enviada, no hacer nada.
    if (data?.notificationStatus === 'sent') {
      return NextResponse.json({ message: 'Notificación ya fue enviada.' });
    }

    const message = `<b>💼 NUEVO PROSPECTO</b>
━━━━━━━━━━━━━━━━━━━━

👤 <b>Cliente:</b> ${escapeHtml(data?.nombre)}
🪪 <b>Cédula:</b> <code>${escapeHtml(data?.cedula)}</code>
📱 <b>WhatsApp:</b> <a href="https://wa.me/57${escapeHtml(data?.contacto)}">${escapeHtml(data?.contacto)}</a>

📌 <b>Detalles del Caso</b>
• <b>ID Sistema:</b> <code>${escapeHtml(docId)}</code>
• <b>Fuente:</b> ${escapeHtml(data?.fuente || 'Web')}
• <b>Estado:</b> 🟡 <i>Pendiente de Revisión</i>

📅 <b>Recibido:</b> ${escapeHtml(new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }))}
━━━━━━━━━━━━━━━━━━━━
💡 <i>Abre el enlace de WhatsApp para contactar.</i>`;

    const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    const telegramResponse = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    const telegramResponseData = await telegramResponse.json();

    if (!telegramResponse.ok) {
      console.error('Telegram API Error:', telegramResponseData);
      // No devolver un error crítico al cliente si solo falla Telegram.
      // Simplemente registrar el error. El estado de la notificación no cambiará.
      return NextResponse.json(
        { error: 'Telegram API call failed but consultation was saved.' },
        { status: 200 }
      );
    }

    // Marcar como notificado para asegurar la idempotencia
    await docRef.update({
      notificationStatus: 'sent',
      notifiedAt: Timestamp.now(),
    });

    return NextResponse.json({ success: true, message: 'Notificación enviada.' });
  } catch (error: any) {
    console.error('Error in /api/notify:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor en /api/notify' },
      { status: 500 }
    );
  }
}
