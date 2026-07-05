import { beforeAll, beforeEach, afterAll, describe, it } from 'vitest';
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require('@firebase/rules-unit-testing');
const fs = require('fs');

let testEnv;

beforeAll(async () => {
  // Inicializa el emulador con las reglas exactas que subiste
  testEnv = await initializeTestEnvironment({
    projectId: 'desmulta-sec-test',
    firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('DevSecOps: Aislamiento de PII y Control de Acceso', () => {
  it('FALLO ESPERADO: Bloquea lectura pública a la colección maestra (consultations)', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    const docRef = unauthedDb.collection('consultations').doc('CASO-090');

    // Si esto pasa (assertSucceeds), tenemos una fuga de datos PII.
    await assertFails(docRef.get());
  });

  it('FALLO ESPERADO: Bloquea intentos de listado (queries) en public_tracking', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    const query = unauthedDb.collection('public_tracking').limit(10);

    // Evita enumeración masiva de la base de datos (Anti-Scraping)
    await assertFails(query.get());
  });

  it('ÉXITO ESPERADO: Permite lectura en public_tracking solo con UUID exacto', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    const testUuid = '550e8400-e29b-41d4-a716-446655440000';
    const docRef = unauthedDb.collection('public_tracking').doc(testUuid);

    // El cliente frontend debe poder leer este documento individual
    await assertSucceeds(docRef.get());
  });

  it('FALLO ESPERADO: Bloquea escritura no autorizada en cualquier colección', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    const docRef = unauthedDb.collection('public_tracking').doc('dummy-id');

    await assertFails(docRef.set({ estado: 'hackeado' }));
  });
});
