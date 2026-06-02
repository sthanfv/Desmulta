import { describe, it, expect, vi, beforeEach } from 'vitest';
import test from 'firebase-functions-test';

// ──────────────────────────────────────────────────────────────────────────────
// Mocks (hoisted para que estén disponibles antes de los imports)
// ──────────────────────────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => {
  const mockEmailsSend = vi.fn();
  const mockFirestoreGet = vi.fn();
  const mockFetch = vi.fn();
  
  const doc = vi.fn(() => ({ 
    get: mockFirestoreGet,
    collection: collection // Permitir chaining para subcolecciones
  }));
  const collection: any = vi.fn(() => ({ doc }));

  return { mockEmailsSend, mockFirestoreGet, mockFetch, doc, collection };
});

global.fetch = mocks.mockFetch;

vi.mock('firebase-admin', () => ({
  default: {
    firestore: vi.fn(() => ({ collection: mocks.collection })),
    messaging: vi.fn(() => ({ send: vi.fn() })),
    apps: ['mock'],
    initializeApp: vi.fn(),
  },
  firestore: vi.fn(() => ({ collection: mocks.collection })),
  messaging: vi.fn(() => ({ send: vi.fn() })),
}));

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(function () {
    return { emails: { send: mocks.mockEmailsSend } };
  }),
}));

vi.mock('firebase-functions', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return { ...actual, logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } };
});

// telegramWebhook se importa para buildCaseReplyMarkup — mockeamos el módulo
// completo para aislar onCaseStatusChange de dependencias externas de red.
vi.mock('../telegramWebhook', () => ({
  buildCaseReplyMarkup: vi.fn(() => ({ inline_keyboard: [] })),
}));

import { onCaseStatusChange, onCaseCreated, onConsultationStatusChange } from '../onCaseStatusChange';

const testEnv = test();

// ──────────────────────────────────────────────────────────────────────────────
// Suite principal
// ──────────────────────────────────────────────────────────────────────────────
describe('onCaseStatusChange — Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 'test_key';
    process.env.TELEGRAM_BOT_TOKEN = 'bot_test_token';
    process.env.TELEGRAM_CHAT_ID = '99999';
    mocks.mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve('OK') });
    mocks.mockEmailsSend.mockResolvedValue({ data: { id: 'email_1' }, error: null });
  });

  // ── Lógica base: sin cambio no hay acción ────────────────────────────────
  it('debe abortar si el estado no cambió', async () => {
    const wrapped = testEnv.wrap(onCaseStatusChange as any);
    const before = testEnv.firestore.makeDocumentSnapshot({ status: 'tramite', consultationId: '1' }, 'cases/1');
    const after  = testEnv.firestore.makeDocumentSnapshot({ status: 'tramite', consultationId: '1' }, 'cases/1');
    await wrapped({ data: testEnv.makeChange(before, after), params: { caseId: '1' } });
    expect(mocks.mockEmailsSend).not.toHaveBeenCalled();
    expect(mocks.mockFetch).not.toHaveBeenCalled();
  });

  // ── Email al cambiar estado ──────────────────────────────────────────────
  it('debe enviar un correo cuando cambia de apertura a radicado', async () => {
    const wrapped = testEnv.wrap(onCaseStatusChange as any);
    const before = testEnv.firestore.makeDocumentSnapshot({ status: 'apertura', consultationId: '123' }, 'cases/1');
    const after  = testEnv.firestore.makeDocumentSnapshot({ status: 'radicado', consultationId: '123' }, 'cases/1');

    mocks.mockFirestoreGet.mockResolvedValue({
      exists: true,
      data: () => ({ emailContacto: 'test@example.com', trackingUuid: 'uuid-1', contacto: '3001234567', placa: 'ABC123', shortId: 'EXP-1' }),
    });

    await wrapped({ data: testEnv.makeChange(before, after), params: { caseId: '1' } });

    expect(mocks.mockEmailsSend).toHaveBeenCalled();
    expect(mocks.mockEmailsSend.mock.calls[0][0].subject).toContain('Radicación oficial completada');
  });

  // ── ⚠️ Aviso de Spam en el email ────────────────────────────────────────
  it('el email debe incluir el aviso de spam para el cliente', async () => {
    const wrapped = testEnv.wrap(onCaseStatusChange as any);
    const before = testEnv.firestore.makeDocumentSnapshot({ status: 'apertura', consultationId: '123' }, 'cases/1');
    const after  = testEnv.firestore.makeDocumentSnapshot({ status: 'radicado', consultationId: '123' }, 'cases/1');

    mocks.mockFirestoreGet.mockResolvedValue({
      exists: true,
      data: () => ({ emailContacto: 'test@example.com', contacto: '3001234567', shortId: 'EXP-1' }),
    });

    await wrapped({ data: testEnv.makeChange(before, after), params: { caseId: '1' } });

    const htmlEnviado: string = mocks.mockEmailsSend.mock.calls[0][0].html;
    expect(htmlEnviado).toContain('Spam o Correo No Deseado');
  });

  // ── Asunto genérico para estados no catalogados ──────────────────────────
  it('debe usar asunto genérico si el status no está en el catálogo', async () => {
    const wrapped = testEnv.wrap(onCaseStatusChange as any);
    const before = testEnv.firestore.makeDocumentSnapshot({ status: 'apertura', consultationId: '123' }, 'cases/1');
    const after  = testEnv.firestore.makeDocumentSnapshot({ status: 'estado_xd', consultationId: '123' }, 'cases/1');

    mocks.mockFirestoreGet.mockResolvedValue({
      exists: true,
      data: () => ({ emailContacto: 'test@example.com', contacto: '3001234567', shortId: 'EXP-1' }),
    });

    await wrapped({ data: testEnv.makeChange(before, after), params: { caseId: '1' } });

    expect(mocks.mockEmailsSend.mock.calls[0][0].subject).toContain('Novedades en tu expediente');
  });

  // ── 🔔 NUEVO: Notificación a Telegram desde Kanban ──────────────────────
  it('debe notificar a Telegram cuando el estado cambia desde el Kanban (caso)', async () => {
    const wrapped = testEnv.wrap(onCaseStatusChange as any);
    const before = testEnv.firestore.makeDocumentSnapshot({ status: 'apertura', consultationId: 'consult-abc' }, 'cases/1');
    const after  = testEnv.firestore.makeDocumentSnapshot({ status: 'radicado', consultationId: 'consult-abc' }, 'cases/1');

    mocks.mockFirestoreGet.mockResolvedValue({
      exists: true,
      data: () => ({
        emailContacto: 'test@example.com',
        contacto: '3001234567',
        placa: 'XYZ999',
        shortId: 'EXP-42',
      }),
    });

    await wrapped({ data: testEnv.makeChange(before, after), params: { caseId: '1' } });

    // Debe haber hecho al menos 1 llamada fetch (Telegram sendMessage)
    const fetchCalls = mocks.mockFetch.mock.calls;
    const telegramCalls = fetchCalls.filter((callArgs: any[]) =>
      callArgs[0].includes('api.telegram.org') && callArgs[0].includes('sendMessage')
    );
    expect(telegramCalls.length).toBeGreaterThanOrEqual(1);

    // El body debe contener el shortId y el nuevo estado
    const bodyStr = JSON.parse(telegramCalls[0][1].body);
    expect(bodyStr.text).toContain('EXP-42');
    expect(bodyStr.chat_id).toBe('99999');
  });

  it('NO debe notificar a Telegram si no hay consultationId (caso sin lead)', async () => {
    const wrapped = testEnv.wrap(onCaseStatusChange as any);
    const before = testEnv.firestore.makeDocumentSnapshot({ status: 'apertura', consultationId: 'N/A' }, 'cases/1');
    const after  = testEnv.firestore.makeDocumentSnapshot({ status: 'radicado', consultationId: 'N/A' }, 'cases/1');

    mocks.mockFirestoreGet.mockResolvedValue({ exists: false, data: () => null });

    await wrapped({ data: testEnv.makeChange(before, after), params: { caseId: '1' } });

    const fetchCalls = mocks.mockFetch.mock.calls;
    const telegramCalls = fetchCalls.filter((callArgs: any[]) =>
      callArgs[0].includes('api.telegram.org') && callArgs[0].includes('sendMessage')
    );
    expect(telegramCalls.length).toBe(0);
  });

  // ── onCaseCreated: email al primer estado ────────────────────────────────
  it('debe enviar email al crear un caso con estado contactado', async () => {
    const wrapped = testEnv.wrap(onCaseCreated as any);
    const snap = testEnv.firestore.makeDocumentSnapshot({ status: 'contactado', consultationId: '123' }, 'cases/1');

    mocks.mockFirestoreGet.mockResolvedValue({
      exists: true,
      data: () => ({ emailContacto: 'new@example.com', trackingUuid: 'uuid-2', contacto: '3009999999', shortId: 'EXP-2' }),
    });

    await wrapped({ data: snap, params: { caseId: '1' } });

    expect(mocks.mockEmailsSend).toHaveBeenCalled();
    expect(mocks.mockEmailsSend.mock.calls[0][0].subject).toContain('especialista se pondrá en contacto');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// onConsultationStatusChange (Leads en el Kanban)
// ──────────────────────────────────────────────────────────────────────────────
describe('onConsultationStatusChange — Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 'test_key';
    process.env.TELEGRAM_BOT_TOKEN = 'bot_test_token';
    process.env.TELEGRAM_CHAT_ID = '99999';
    mocks.mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve('OK') });
    mocks.mockEmailsSend.mockResolvedValue({ data: { id: 'email_lead' }, error: null });
  });

  it('debe abortar si el estado del lead no cambió', async () => {
    const wrapped = testEnv.wrap(onConsultationStatusChange as any);
    const before = testEnv.firestore.makeDocumentSnapshot({ status: 'estudio', emailContacto: 'x@x.com' }, 'consultations/1');
    const after  = testEnv.firestore.makeDocumentSnapshot({ status: 'estudio', emailContacto: 'x@x.com' }, 'consultations/1');

    await wrapped({ data: testEnv.makeChange(before, after), params: { consultationId: '1' } });

    expect(mocks.mockEmailsSend).not.toHaveBeenCalled();
    expect(mocks.mockFetch).not.toHaveBeenCalled();
  });

  it('debe enviar email (y no duplicar notif en Telegram) cuando el lead avanza de estado', async () => {
    const wrapped = testEnv.wrap(onConsultationStatusChange as any);
    const before = testEnv.firestore.makeDocumentSnapshot({ status: 'pendiente', emailContacto: 'lead@test.com' }, 'consultations/lead-1');
    const after  = testEnv.firestore.makeDocumentSnapshot({ status: 'contactado', emailContacto: 'lead@test.com', consultationId: 'lead-1' }, 'consultations/lead-1');

    // processCaseEmail lee la consulta por consultationId (que aquí es el mismo doc)
    mocks.mockFirestoreGet.mockResolvedValue({
      exists: true,
      data: () => ({
        emailContacto: 'lead@test.com',
        contacto: '3001111111',
        placa: 'N/A',
        shortId: 'EXP-99',
      }),
    });

    await wrapped({ data: testEnv.makeChange(before, after), params: { consultationId: 'lead-1' } });

    // ✅ Email al cliente
    expect(mocks.mockEmailsSend).toHaveBeenCalled();

    // ✅ NO Telegram al operador (se delegó a onCaseStatusChange)
    const fetchCalls = mocks.mockFetch.mock.calls;
    const telegramCalls = fetchCalls.filter((callArgs: any[]) =>
      callArgs[0].includes('api.telegram.org') && callArgs[0].includes('sendMessage')
    );
    expect(telegramCalls.length).toBe(0);
  });
});
