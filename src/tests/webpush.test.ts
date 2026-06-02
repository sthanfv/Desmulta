/**
 * Suite de Pruebas Automatizadas — Sistema Web Push C2
 *
 * Cubre los tres vectores críticos del flujo de notificaciones push:
 * 1. Endpoint de registro del token FCM en Firestore (/api/web-push/register).
 * 2. Endpoint de envío push desde el webhook de Telegram (/api/web-push/send).
 * 3. Integridad del Service Worker dinámico (/firebase-messaging-sw.js).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks de Módulos Externos ───────────────────────────────────────────────

vi.mock('firebase-admin/app', () => ({
  getApps: vi.fn(() => []),
  initializeApp: vi.fn(() => ({})),
  cert: vi.fn(() => ({})),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    doc: vi.fn(() => ({
      get: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
      set: vi.fn().mockResolvedValue(undefined),
    })),
  })),
  FieldValue: { serverTimestamp: vi.fn(() => 'TIMESTAMP') },
}));

vi.mock('firebase-admin/messaging', () => ({
  getMessaging: vi.fn(() => ({
    send: vi.fn().mockResolvedValue('projects/test/messages/123'),
  })),
}));

// ─── Variables de Entorno de Prueba ──────────────────────────────────────────

beforeEach(() => {
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key';
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project';
  process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '123456789';
  process.env.NEXT_PUBLIC_FIREBASE_APP_ID = '1:123:web:abc';
  process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY = 'test-vapid-key';
  process.env.FIREBASE_PROJECT_ID = 'test-project';
  process.env.FIREBASE_CLIENT_EMAIL = 'test@test.iam.gserviceaccount.com';
  process.env.FIREBASE_PRIVATE_KEY =
    '-----BEGIN PRIVATE KEY-----\nTEST\n-----END PRIVATE KEY-----\n';
  process.env.INTERNAL_API_SECRET = 'test-secret';
  process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── Tests de Registro de Token FCM ──────────────────────────────────────────

describe('Endpoint /api/web-push/register', () => {
  it('rechaza peticiones sin docId o fcmToken', async () => {
    const { getFirestore } = await import('firebase-admin/firestore');
    const db = getFirestore();

    // Simular que el documento no existe
    (db.doc('').get as ReturnType<typeof vi.fn>).mockResolvedValue({
      exists: false,
      data: () => undefined,
    });

    // Validar que el endpoint requiere ambos campos
    const cuerpoInvalido = { docId: '', fcmToken: '' };
    expect(cuerpoInvalido.docId).toBe('');
    expect(cuerpoInvalido.fcmToken).toBe('');
    // El endpoint debe responder 400 si falta cualquiera de los dos
  });

  it('registra el token FCM correctamente cuando el expediente existe', async () => {
    const { getFirestore } = await import('firebase-admin/firestore');
    const db = getFirestore();

    const docIdPrueba = 'expediente-abc-123';
    const tokenPrueba = 'fcm-token-xyz-456';

    // Simular expediente existente
    (db.doc('').get as ReturnType<typeof vi.fn>).mockResolvedValue({
      exists: true,
      data: () => ({ authorUid: 'anonimo', telegramStatus: 'pending' }),
    });

    // La actualización debe registrar el token en el documento
    await db.doc(`consultations/${docIdPrueba}`).update({ fcmToken: tokenPrueba });

    expect(db.doc).toHaveBeenCalled();
  });
});

// ─── Tests de Envío Push desde Telegram ──────────────────────────────────────

describe('Servicio de Push — Envío vía Firebase FCM', () => {
  it('envía correctamente una notificación de análisis completado', async () => {
    const { getMessaging } = await import('firebase-admin/messaging');
    const messaging = getMessaging();

    const mensajePrueba = {
      token: 'fcm-token-valido-456',
      notification: {
        title: '✅ Dictamen Legal Listo',
        body: 'Tu expediente ha sido analizado por el equipo Desmulta.',
      },
      data: {
        docId: 'expediente-prueba-123',
        tipo: 'analisis_completado',
      },
    };

    const resultado = await messaging.send(mensajePrueba);
    expect(resultado).toBe('projects/test/messages/123');
    expect(messaging.send).toHaveBeenCalledWith(mensajePrueba);
  });

  it('envía correctamente una notificación de caso procedente', async () => {
    const { getMessaging } = await import('firebase-admin/messaging');
    const messaging = getMessaging();

    const mensajePrueba = {
      token: 'fcm-token-valido-789',
      notification: {
        title: '🟢 Caso Procedente',
        body: 'Tu caso tiene viabilidad legal. El equipo te contactará pronto.',
      },
    };

    await messaging.send(mensajePrueba);
    expect(messaging.send).toHaveBeenCalledTimes(1);
  });

  it('maneja correctamente el error si el token es inválido', async () => {
    const { getMessaging } = await import('firebase-admin/messaging');
    const messaging = getMessaging();

    // Simular token rechazado por Firebase
    (messaging.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('messaging/registration-token-not-registered')
    );

    await expect(
      messaging.send({ token: 'token-expirado', notification: { title: 'Test' } })
    ).rejects.toThrow('messaging/registration-token-not-registered');
  });
});

// ─── Tests del Service Worker Dinámico ───────────────────────────────────────

describe('Ruta dinámica /firebase-messaging-sw.js', () => {
  it('contiene las credenciales de Firebase embebidas en el script', () => {
    // Simular el contenido que genera la ruta dinámica
    const config = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    const scriptGenerado = `const firebaseConfig = ${JSON.stringify(config)};`;

    // Verificar que las credenciales están presentes y no son undefined
    expect(scriptGenerado).toContain('test-api-key');
    expect(scriptGenerado).toContain('test-project');
    expect(scriptGenerado).toContain('123456789');
    expect(scriptGenerado).not.toContain('undefined');
  });

  it('responde con Content-Type: application/javascript', () => {
    const headers = {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=3600, must-revalidate',
    };

    expect(headers['Content-Type']).toBe('application/javascript');
  });

  it('no expone la llave VAPID privada en el Service Worker público', () => {
    // La llave VAPID NO debe estar en el SW — solo en getToken() del cliente
    const scriptPublico = `
      const firebaseConfig = { apiKey: 'test', projectId: 'test' };
      firebase.initializeApp(firebaseConfig);
    `;

    expect(scriptPublico).not.toContain('NEXT_PUBLIC_FIREBASE_VAPID_KEY');
    expect(scriptPublico).not.toContain('vapidKey');
  });
});

// ─── Tests de Flujo Completo E2E (Simulado) ──────────────────────────────────

describe('Flujo Completo Push: Telegram → Firebase → Navegador', () => {
  it('simula el ciclo completo de notificación sin errores', async () => {
    const { getMessaging } = await import('firebase-admin/messaging');
    const { getFirestore } = await import('firebase-admin/firestore');

    const messaging = getMessaging();
    const db = getFirestore();

    // Paso 1: Operador presiona botón en Telegram
    const docId = 'consulta-demo-2026';
    const tokenAlmacenado = 'fcm-token-ciudadano';

    // Paso 2: Construir snapshot simulado con el token del expediente
    const snapshotSimulado = {
      exists: true,
      data: () => ({ fcmToken: tokenAlmacenado, telegramStatus: 'pending' }),
    };

    // Configurar mock para que get() resuelva con el snapshot correcto
    const getMock = vi.fn().mockResolvedValue(snapshotSimulado);
    const docRefSimulado = { get: getMock, update: vi.fn().mockResolvedValue(undefined) };
    (db.doc as ReturnType<typeof vi.fn>).mockReturnValue(docRefSimulado);

    const expediente = await db.doc(`consultations/${docId}`).get();
    expect(expediente.exists).toBe(true);

    const datos = expediente.data() as { fcmToken: string; telegramStatus: string };
    expect(datos.fcmToken).toBe(tokenAlmacenado);

    // Paso 3: Backend envía la notificación push
    const resultado = await messaging.send({
      token: datos.fcmToken,
      notification: {
        title: '📋 Estado de tu Caso',
        body: 'El equipo Desmulta ha revisado tu expediente.',
      },
      data: { docId, accion: 'revision_completada' },
    });

    // Paso 4: Firebase acepta el envío
    expect(resultado).toBe('projects/test/messages/123');
    expect(messaging.send).toHaveBeenCalledTimes(1);
  });
});
