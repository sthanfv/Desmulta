require('dotenv').config({ path: '.env.local' }); // Lee el .env local

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_TECH_CHAT_ID;

if (!token || !chatId) {
  console.error('❌ ERROR: Faltan las variables TELEGRAM_BOT_TOKEN o TELEGRAM_TECH_CHAT_ID en tu archivo .env.local');
  process.exit(1);
}

const text = `✅ <b>TEST DEL SISTEMA: Desmulta</b>\n📍 <b>Origen:</b> <code>test-telegram.js</code>\nℹ️ <b>Detalle:</b>\n<pre>¡El webhook de Telegram está funcionando perfectamente!</pre>\n⏱ <b>Timestamp:</b> ${new Date().toISOString()}`;

console.log('Enviando mensaje de prueba a Telegram...');

fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
})
  .then(res => res.json())
  .then(data => {
    if (data.ok) {
      console.log('✅ Mensaje entregado con éxito a Telegram. Revisa tu celular.');
    } else {
      console.error('❌ Error devolviendo desde Telegram:', data);
    }
  })
  .catch(err => console.error('❌ Error de red:', err));
