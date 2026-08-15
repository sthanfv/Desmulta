import './setup-env';
import { Client as QStashClient } from '@upstash/qstash';

async function testDLQ() {
  console.log('🧪 Simulando caída de Telegram (Usando Token Falso)...');
  const qstashToken = process.env.QSTASH_TOKEN;
  if (!qstashToken) return console.log('Sin token de QStash en .env');

  const qstash = new QStashClient({ token: qstashToken });
  const fakeToken = '123456789:FAKE_TOKEN_QUE_FALLARA_A_PROPOSITO';
  const targetUrl = `https://api.telegram.org/bot${fakeToken}/sendMessage`;

  try {
    const res = await qstash.publishJSON({
      url: targetUrl,
      body: {
        chat_id: process.env.TELEGRAM_DEV_CHAT_ID || '123456',
        text: '🚨 [TEST DLQ] Este mensaje fallará en Telegram y se quedará en Upstash QStash como Dead Letter.',
      },
    });

    console.log('✅ Mensaje envenenado encolado exitosamente en QStash.');
    console.log('ID del Mensaje:', res.messageId);
    console.log(
      'Ve a https://console.upstash.com/qstash, entra a tu base de datos y verás que este mensaje recibe un ERROR 401/404 de Telegram y entra en ciclo de Retry (y luego a DLQ).'
    );
  } catch (e) {
    console.error('Error al encolar:', e);
  }
}
testDLQ();
