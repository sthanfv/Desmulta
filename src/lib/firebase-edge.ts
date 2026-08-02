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
export async function logToFirestoreEdge(dataPayload: Record<string, unknown>) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!projectId || !apiKey) {
    throw new Error('Faltan variables de entorno de Firebase');
  }

  // Endpoint oficial de la REST API de Google Firestore
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/edge_telemetry?key=${apiKey}`;

  // Firestore REST requiere un formato estricto llamado "Value Mapping"
  const bodyData = {
    fields: {
      timestamp: { stringValue: new Date().toISOString() },
      status: { stringValue: 'Operación Edge Exitosa' },
      clientData: { stringValue: JSON.stringify(dataPayload) },
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyData),
    // Esto evita que Next.js intente cachear la respuesta en el servidor
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Edge Firebase Error: ${errorText}`);
  }

  return await response.json();
}
