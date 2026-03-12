import { NextResponse } from 'next/server';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';

// ✅ MANDATO-FILTRO: Ruta de cron protegida con Bearer token secreto.
// Solo Vercel Cron puede llamar esta ruta (cabecera Authorization: Bearer CRON_SECRET).
// Referencia: https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs

// Límite de reintentos por ejecución: evita floods si hay muchos fallidos
const MAX_RETRIES_PER_RUN = 10;

function escapeHtml(text: string): string {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  // ✅ AUTH: Verificar Bearer token para Vercel Cron
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return NextResponse.json({ error: 'Telegram env vars not configured.' }, { status: 500 });
  }

  try {
    getAdminApp();
    const db = getFirestore();

    // ✅ COSTO OPTIMIZADO: Filtramos solo los documentos fallidos.
    // Si no hay ninguno, Firestore no cobra por documentos leídos,
    // solo una fracción de la petición de consulta.
    const failedQuery = db
      .collection('consultations')
      .where('telegramStatus', '==', 'failed')
      .orderBy('createdAt', 'asc')
      .limit(MAX_RETRIES_PER_RUN);

    const snapshot = await failedQuery.get();

    if (snapshot.empty) {
      return NextResponse.json({
        success: true,
        message: 'Sin notificaciones pendientes. Costo: mínimo.',
        retried: 0,
      });
    }

    let successCount = 0;
    let failCount = 0;

    for (const docSnap of snapshot.docs) {
      const docId = docSnap.id;
      const data = docSnap.data();

      const message = `<b>🔄 REINTENTO DE NOTIFICACIÓN</b>
━━━━━━━━━━━━━━━━━━━━

👤 <b>Cliente:</b> ${escapeHtml(data?.nombre)}
🚗 <b>Placa:</b> <code>${escapeHtml(data?.placa || 'N/A')}</code>
📱 <b>WhatsApp:</b> <a href="https://wa.me/57${escapeHtml(data?.contacto)}">${escapeHtml(data?.contacto)}</a>

📌 <b>Detalles</b>
• <b>ID Sistema:</b> <code>${escapeHtml(docId)}</code>
• <b>Estado:</b> 🟠 <i>Reintento de entrega</i>

━━━━━━━━━━━━━━━━━━━━
⚙️ <i>Enviado por el sistema de recuperación.</i>`;

      try {
        const telegramRes = await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: TELEGRAM_CHAT_ID,
              text: message,
              parse_mode: 'HTML',
            }),
          }
        );

        if (telegramRes.ok) {
          await docSnap.ref.update({
            telegramStatus: 'sent',
            retriedAt: FieldValue.serverTimestamp(),
          });
          successCount++;
        } else {
          failCount++;
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Error desconocido';
        console.error(`[cron/retry] Error reintentando doc ${docId}:`, errMsg);
        failCount++;
      }
    }

    return NextResponse.json({
      success: true,
      retried: snapshot.size,
      recovered: successCount,
      stillFailed: failCount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error('[cron/retry-notifications] Error interno:', message);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
