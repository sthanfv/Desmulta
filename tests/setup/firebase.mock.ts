import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

/**
 * Firebase Integration Helper — Desmulta v8.2.0
 * 
 * Este archivo garantiza que las pruebas de integración apunten al puerto 8080 
 * del Firebase Local Emulator Suite, protegiendo la base de datos de producción
 * contra mutaciones accidentales durante el desarrollo.
 */

// Configuración de demostración estática para ejecución en emulador
const firebaseConfig = {
  projectId: "demo-desmulta",
  apiKey: "fake-api-key",
};

const app = initializeApp(firebaseConfig);
export const testDb = getFirestore(app);

// Conexión automática al Suite de Emuladores Local
// MANDATO-FILTRO: No usar PII real en este entorno.
connectFirestoreEmulator(testDb, '127.0.0.1', 8080);
