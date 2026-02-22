import { NextResponse } from 'next/server';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';

// Helper para escapar caracteres HTML en mensajes de Telegram
function escapeHtml(text: string): string {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Inicializar Firebase Admin SDK via singleton seguro
try {
  getAdminApp();
} catch (error) {
  const message = error instanceof Error ? error.message : 'Error desconocido';
  console.error('[firebase-admin] Error de inicialización:', message);
}

export async function POST(request: Request) {
  // ✅ AUTH INTERNA: Solo el propio servidor puede llamar a este endpoint.
  // create-consultation/route.ts envía el header x-internal-secret.
  const internalSecret = process.env.INTERNAL_API_SECRET;
  const receivedSecret = request.headers.get('x-internal-secret');

  if (!internalSecret || receivedSecret !== internalSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('[notify] Variables de Telegram no configuradas.');
    return NextResponse.json(
      { success: false, error: 'Server configuration error.' },
      { status: 500 }
    );
  }

  try {
    const rawBody = await request.text();

    if (!rawBody) {
      console.error('[notify] Cuerpo de la petición vacío.');
      return NextResponse.json(
        { success: false, error: 'Cuerpo de la petición vacío.' },
        { status: 400 }
      );
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      console.error('[notify] Error al parsear JSON.');
      return NextResponse.json(
        { success: false, error: 'Formato JSON inválido.' },
        { status: 400 }
      );
    }

    const parsed = body as Record<string, unknown>;
    const docId = typeof parsed.docId === 'string' ? parsed.docId : null;

    if (!docId) {
      return NextResponse.json(
        { success: false, error: 'Document ID es requerido.' },
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

    const telegramResponseData = (await telegramResponse.json()) as Record<string, unknown>;

    if (!telegramResponse.ok) {
      console.error('[notify] Telegram API Error:', JSON.stringify(telegramResponseData));
      // No devolver error crítico al proceso: la consulta ya fue guardada.
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error('[notify] Error interno:', message);
    return NextResponse.json(
      { error: 'Error interno del servidor en /api/notify' },
      { status: 500 }
    );
  }
}
