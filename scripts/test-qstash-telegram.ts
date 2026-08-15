import './setup-env';
import { SecurityLogger } from '../src/lib/logger/security-logger';

async function testQStash() {
  console.log('Enviando alerta de prueba a Telegram vía QStash...');

  SecurityLogger.error('PRUEBA_DLQ', {
    mensaje:
      'Esta es una alerta de prueba generada localmente para probar que QStash despacha a Telegram exitosamente.',
    fecha: new Date().toISOString(),
  });

  console.log('Alerta encolada. Revisa Telegram (y la consola de Upstash si hay retrasos).');
}

testQStash();
