import { NextRequest } from 'next/server';
import { POST } from './src/app/api/qstash/_simit-worker/route';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function runWorker() {
  const req = new NextRequest('http://localhost:3000/api/qstash/simit-worker', {
    method: 'POST',
    body: JSON.stringify({ cedulas: ["88145123"] })
  });

  console.log("Iniciando worker localmente...");
  const res = await POST(req);
  console.log("Worker finalizado con status:", res.status);
  
  const text = await res.text();
  console.log("Respuesta:", text);
}

runWorker().catch(console.error);
