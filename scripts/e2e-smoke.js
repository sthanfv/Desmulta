async function testSystem() {
  const baseUrl = 'http://localhost:9005';
  console.log('--- INICIANDO PRUEBAS END-TO-END DE LOS 3 PILARES ---');

  // 1. Prueba de Rate Limiting (Pilar 3)
  console.log('\n[Pilar 3] Probando Rate Limit en calcular-multa...');
  let rateLimitBlocked = false;
  for (let i = 1; i <= 15; i++) {
    const res = await fetch(`${baseUrl}/api/public/calcular-multa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        valorMulta: 100000,
        fechaInfraccion: '2023-01-01',
      }),
    });

    if (res.status === 429) {
      console.log(
        `✅ Rate limit activado correctamente en intento ${i}. Retry-After: ${res.headers.get('retry-after')}`
      );
      rateLimitBlocked = true;
      break;
    }
  }
  if (!rateLimitBlocked) {
    console.error('❌ Fallo: Rate limit NO se activó.');
  }

  // 2. Prueba Crash Report (Pilar 1 - Oversized Payload & Secret Auth)
  console.log('\n[Pilar 1] Probando Crash Report Payload Gigante y Auth...');
  const hugeString = 'a'.repeat(5000); // Excede límite de 2000
  const crashResInvalidAuth = await fetch(`${baseUrl}/api/internal/crash-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-secret': 'invalid_secret' },
    body: JSON.stringify({ message: hugeString }),
  });

  if (crashResInvalidAuth.status === 401) {
    console.log('✅ Auth rechazada correctamente para Crash Report.');
  } else {
    console.error(
      `❌ Fallo: Crash Report aceptó petición sin secreto válido. Status: ${crashResInvalidAuth.status}`
    );
  }

  // Si no tenemos el secreto real, al menos sabemos que la auth funciona.

  // 3. Prueba Middleware Chaos Auth Drop (Pilar 3)
  console.log('\n[Pilar 3] Probando redirección /admin...');
  const adminRes = await fetch(`${baseUrl}/admin`, { redirect: 'manual' });
  if (adminRes.status === 302 || adminRes.status === 307) {
    const location = adminRes.headers.get('location');
    console.log(`✅ Middleware interceptó /admin. Redirect a: ${location}`);
  } else {
    console.error(`❌ Fallo: Middleware no interceptó /admin. Status: ${adminRes.status}`);
  }

  console.log('\n--- PRUEBAS COMPLETADAS ---');
}

testSystem().catch(console.error);
