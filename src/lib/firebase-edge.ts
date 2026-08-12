// src/lib/firebase-edge.ts

/**
 * @deprecated AUDITORÍA 2026-08-01: Este módulo es código muerto.
 * La función `logToFirestoreEdge` usa la REST API de Firestore con API Key pública,
 * pero la colección `edge_telemetry` tiene reglas `allow read, write: if false`
 * en firestore.rules, por lo que NUNCA puede escribir exitosamente.
 *
 * Se conserva por referencia histórica. NO usar en código nuevo.
 * Si se necesita telemetría Edge, usar Server Actions con Firebase Admin SDK.
 */

/**
 * Conector Experimental Edge-to-Firestore.
 * Utiliza 0% dependencias de Node.js. 100% API Fetch nativa.
 */
export async function logToFirestoreEdge(_dataPayload: Record<string, unknown>) {
  throw new Error(
    '[ELIMINADO] firebase-edge.ts fue desconectado permanentemente. ' +
    'Usar Server Actions con Firebase Admin SDK para telemetría.'
  );
}
