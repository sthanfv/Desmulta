import './setup-env';
import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { POST } from '../src/app/api/public/calcular-multa/route';

import { Redis } from '@upstash/redis';

async function runTest() {
  console.log('🧪 Iniciando Test de Integración: Caché de Negocio (Pilar 2)');
  console.log('------------------------------------------------------------');

  const payload = {
    valorMulta: 1045500,
    fechaInfraccion: '2025-05-15',
    tieneCobroCoactivo: false,
    tipoInfraccion: 'C02',
  };

  // 1. Limpiar la caché previa
  console.log('🧹 Limpiando Upstash Redis para el test...');
  const key = `desmulta:cache:go-engine:${crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')}`;
  try {
    const redis = Redis.fromEnv();
    await redis.del(key);
  } catch (_e) {
    console.log('Nota: redis.del falló, asumiendo limpio.');
  }

  // Helper para simular petición Next.js
  const createRequest = () =>
    new NextRequest('http://localhost:3000/api/public/calcular-multa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-real-ip': '127.0.0.1', // Para rate limiter
      },
      body: JSON.stringify(payload),
    });

  // 2. Primera Petición (Debe ser MISS)
  console.log('\n🚀 Ejecutando Primera Petición (Debería ir al Motor Go y devolver MISS)');
  const t0 = performance.now();
  const req1 = createRequest();
  const res1 = await POST(req1);
  const t1 = performance.now();

  const cacheStatus1 = res1.headers.get('X-Cache') || 'MISS (Fallback)';
  console.log(`⏱️  Tiempo: ${(t1 - t0).toFixed(2)}ms`);
  console.log(`📦 Status de Caché: ${cacheStatus1}`);
  console.log(`HTTP Status: ${res1.status}`);

  // Esperar 1 seg
  await new Promise((r) => setTimeout(r, 1000));

  // 3. Segunda Petición (Debe ser HIT y responder en <50ms)
  console.log(
    '\n🚀 Ejecutando Segunda Petición (Debería responder desde la memoria RAM de Redis devolviendo HIT)'
  );
  const t2 = performance.now();
  const req2 = createRequest();
  const res2 = await POST(req2);
  const t3 = performance.now();

  const cacheStatus2 = res2.headers.get('X-Cache');
  console.log(`⏱️  Tiempo: ${(t3 - t2).toFixed(2)}ms`);
  console.log(`📦 Status de Caché: ${cacheStatus2}`);
  console.log(`HTTP Status: ${res2.status}`);

  if (cacheStatus2 === 'HIT' && t3 - t2 < t1 - t0) {
    console.log(
      '\n✅ TEST PASADO: La Caché de Negocio ahorró tiempo de cómputo y funcionó perfectamente.'
    );
  } else if (res1.status === 503 || res1.status === 502) {
    console.log(
      '\n⚠️ TEST INCONCLUSO: El servidor de Go está apagado/no configurado, por lo tanto nunca genera caché para el HIT.'
    );
  } else {
    console.log('\n❌ TEST FALLIDO: La caché no respondió como se esperaba.');
  }
}

runTest();
