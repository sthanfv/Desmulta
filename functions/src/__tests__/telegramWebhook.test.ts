import { describe, it, expect, vi, beforeEach } from 'vitest';
import test from 'firebase-functions-test';

// ──────────────────────────────────────────────────────────────────────────────
// Mocks
// ──────────────────────────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  mockFetch: vi.fn(),
  mockMessagingSend: vi.fn(),
  mockFirestoreSet: vi.fn(),
  mockFirestoreGet: vi.fn(),
}));

global.fetch = mocks.mockFetch;

vi.mock('firebase-admin', () => {
  const get = mocks.mockFirestoreGet;
  const set = mocks.mockFirestoreSet;
  const doc = vi.fn(() => ({ get, set }));
  const collection = vi.fn(() => ({
    doc,
    count: vi.fn(() => ({
      get: vi.fn(() => Promise.resolve({ data: () => ({ count: 10 }) })),
    })),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  }));

  return {
    default: {
      firestore: vi.fn(() => ({ collection })),
      messaging: vi.fn(() => ({ send: mocks.mockMessagingSend })),
      apps: ['mock'],
      initializeApp: vi.fn(),
    },
    firestore: Object.assign(vi.fn(() => ({ collection })), {
      FieldValue: { serverTimestamp: vi.fn(), arrayUnion: vi.fn((...a: unknown[]) => a) },
      Timestamp: { now: vi.fn(() => ({ toDate: () => new Date() })), fromDate: vi.fn() },
    }),
    messaging: vi.fn(() => ({ send: mocks.mockMessagingSend })),
  };
});

vi.mock('firebase-functions', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  };
});

import { buildCaseReplyMarkup } from '../telegramWebhook';
import { telegramWebhook } from '../telegramWebhook';
import { encryptSymmetric } from '../crypto-utils';

// ──────────────────────────────────────────────────────────────────────────────
// Tests de buildCaseReplyMarkup (la función pura exportada)
// ──────────────────────────────────────────────────────────────────────────────
describe('buildCaseReplyMarkup — Pipeline completo de 8 estados', () => {
  const DOC_ID = 'consult_test_123';
  const WA_URL = 'https://wa.me/573001234567';

  it('debe generar exactamente 5 filas de botones (4 estados + WhatsApp)', () => {
    const markup = buildCaseReplyMarkup(DOC_ID, WA_URL);
    expect(markup.inline_keyboard).toHaveLength(5);
  });

  it('debe incluir todos los 8 estados del Kanban como botones', () => {
    const markup = buildCaseReplyMarkup(DOC_ID, WA_URL);
    const allButtons = markup.inline_keyboard.flat();
    const callbackDatas = allButtons
      .map((b: any) => b.callback_data)
      .filter(Boolean);

    const expectedStates = ['pendiente', 'contactado', 'estudio', 'descartado', 'apertura', 'radicado', 'tramite', 'finalizado'];
    for (const estado of expectedStates) {
      expect(callbackDatas).toContain(`estado_${estado}_${DOC_ID}`);
    }
  });

  it('el botón de WhatsApp debe ser un link URL (no callback)', () => {
    const markup = buildCaseReplyMarkup(DOC_ID, WA_URL);
    const lastRow = markup.inline_keyboard[markup.inline_keyboard.length - 1];
    const waBtn = lastRow[0] as any;
    expect(waBtn.url).toBe(WA_URL);
    expect(waBtn.callback_data).toBeUndefined();
  });

  it('debe marcar el estado actual con 👉 y su callback_data como "noop"', () => {
    const markup = buildCaseReplyMarkup(DOC_ID, WA_URL, 'estudio');
    const allButtons = markup.inline_keyboard.flat();

    const estudiaBtn = allButtons.find((b: any) => b.text?.includes('En Estudio'));
    expect(estudiaBtn).toBeDefined();
    expect((estudiaBtn as any)!.text).toContain('👉');
    expect((estudiaBtn as any)!.callback_data).toBe('noop');
  });

  it('los demás estados NO deben tener 👉 ni ser noop', () => {
    const markup = buildCaseReplyMarkup(DOC_ID, WA_URL, 'estudio');
    const allButtons = markup.inline_keyboard.flat();

    // Excluimos el botón de WhatsApp (tiene url, no callback_data)
    const actionButtons = allButtons.filter((b: any) => b.callback_data && b.callback_data !== 'noop');
    for (const btn of actionButtons as any[]) {
      expect(btn.text).not.toContain('👉');
    }
  });

  it('sin currentState, ningún botón debe ser noop', () => {
    const markup = buildCaseReplyMarkup(DOC_ID, WA_URL);
    const allButtons = markup.inline_keyboard.flat();
    const noopButtons = allButtons.filter((b: any) => b.callback_data === 'noop');
    expect(noopButtons).toHaveLength(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Tests del webhook HTTP
// ──────────────────────────────────────────────────────────────────────────────
describe('telegramWebhook — Seguridad y comandos', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockFirestoreGet.mockReset();
    mocks.mockFetch.mockReset();
    mocks.mockMessagingSend.mockReset();

    process.env.TELEGRAM_WEBHOOK_SECRET = 'secret_test';
    process.env.TELEGRAM_BOT_TOKEN = 'token_test';
    process.env.PII_ENCRYPTION_KEY = 'test_encryption_key_32_bytes_long!!';
    process.env.PII_HMAC_SECRET = 'test_hmac_secret_value_for_testing';

    req = {
      headers: { 'x-telegram-bot-api-secret-token': 'secret_test' },
      body: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };
    mocks.mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve('OK') });
  });

  it('debe rechazar si el secret no coincide (seguridad)', async () => {
    req.headers['x-telegram-bot-api-secret-token'] = 'wrong_token';
    await (telegramWebhook as any)(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mocks.mockFetch).not.toHaveBeenCalled();
  });

  it('debe responder al comando /start con el menú de comandos', async () => {
    req.body = { message: { chat: { id: 12345 }, text: '/start' } };
    await (telegramWebhook as any)(req, res);
    expect(mocks.mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('sendMessage'),
      expect.objectContaining({ body: expect.stringContaining('DESMULTA CRM BOT') })
    );
  });

  it('debe responder al comando /resumen con estadísticas', async () => {
    req.body = { message: { chat: { id: 12345 }, text: '/resumen' } };
    await (telegramWebhook as any)(req, res);
    expect(mocks.mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('sendMessage'),
      expect.objectContaining({ body: expect.stringContaining('RESUMEN DESMULTA') })
    );
  });

  it('debe procesar callback de estado y llamar a cambiarEstado', async () => {
    req.body = {
      callback_query: {
        id: 'cb456',
        from: { id: 111, first_name: 'Ana' },
        data: 'estado_radicado_doc999',
        message: { chat: { id: 999 }, message_id: 777, text: 'texto original' },
      },
    };

    // 1. processed_callbacks.get() → no existe (primera vez)
    mocks.mockFirestoreGet.mockResolvedValueOnce({ exists: false });
    // 2. consultations.doc(docId).get() → lead válido (para cambiarEstado)
    mocks.mockFirestoreGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ status: 'estudio', contacto: '3001234567', nombre: 'Ana García' }),
    });
    // 3. public_tracking lookup (puede existir o no)
    mocks.mockFirestoreGet.mockResolvedValueOnce({ exists: false });
    // 4. cases lookup → no existe aún
    mocks.mockFirestoreGet.mockResolvedValueOnce({ empty: true, docs: [] });
    // 5. consultations re-read para buildCaseReplyMarkup en editMessageText
    mocks.mockFirestoreGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ contacto: '3001234567', placa: 'ABC', shortId: 'EXP-9' }),
    });

    await (telegramWebhook as any)(req, res);

    // Debe haber llamado a answerCallbackQuery
    const fetchUrls = mocks.mockFetch.mock.calls.map((callArgs: any[]) => callArgs[0]);
    expect(fetchUrls.some((u: string) => u.includes('answerCallbackQuery'))).toBe(true);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('debe ignorar callbacks duplicados (idempotencia)', async () => {
    req.body = {
      callback_query: {
        id: 'cb_dup',
        from: { id: 111, first_name: 'Bot' },
        data: 'estado_contactado_doc_dup',
        message: { chat: { id: 999 }, message_id: 777, text: 'x' },
      },
    };

    // processed_callbacks.get() → ya existe
    mocks.mockFirestoreGet.mockResolvedValueOnce({ exists: true });

    await (telegramWebhook as any)(req, res);

    const fetchUrls = mocks.mockFetch.mock.calls.map((callArgs: any[]) => callArgs[0]);
    // Solo debe llamar a answerCallbackQuery con "Ya procesado"
    expect(fetchUrls.some((u: string) => u.includes('answerCallbackQuery'))).toBe(true);
    // NO debe llamar a editMessageText (no hay cambio real de estado)
    expect(fetchUrls.some((u: string) => u.includes('editMessageText'))).toBe(false);
    // NO debe haber intentado fetchear sendMessage adicional
    expect(fetchUrls.some((u: string) => u.includes('sendMessage'))).toBe(false);
  });

  it('debe procesar callback push_viable y responder a Telegram en cada paso', async () => {
    req.body = {
      callback_query: {
        id: 'cb789',
        from: { id: 111, first_name: 'Bob' },
        data: 'push_viable_doc123',
        message: { chat: { id: 999 }, message_id: 888 },
      },
    };

    // 1. processed_callbacks.get() → no existe (no duplicado)
    mocks.mockFirestoreGet.mockResolvedValueOnce({ exists: false });
    // 2. consultations.doc('doc123').get() → tiene fcmToken (el set() del cbRef no necesita mock)
    mocks.mockFirestoreGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ fcmToken: 'fcm_token_xyz' }),
    });

    await (telegramWebhook as any)(req, res);

    // El webhook debe haber respondido al menos una vez (answerCallbackQuery)
    const fetchUrls = mocks.mockFetch.mock.calls.map((callArgs: any[]) => callArgs[0]);
    expect(fetchUrls.some((u: string) => u.includes('answerCallbackQuery'))).toBe(true);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  describe('Callback vercedula_ (Revelado seguro de cédula)', () => {
    it('debe procesar vercedula_ descifrando la cédula correctamente y respondiendo con show_alert', async () => {
      const cedulaReal = '1090123456';
      const cedulaCifrada = encryptSymmetric(cedulaReal);

      req.body = {
        callback_query: {
          id: 'cb_ced',
          from: { id: 111, first_name: 'Bob' },
          data: 'vercedula_doc123_cedula',
          message: { chat: { id: 999 }, message_id: 888 },
        },
      };

      // 1. processed_callbacks.get() → no existe
      mocks.mockFirestoreGet.mockResolvedValueOnce({ exists: false });
      // 2. consultations.doc('doc123_cedula').get() → tiene la cédula cifrada
      mocks.mockFirestoreGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ cedula: cedulaCifrada }),
      });

      await (telegramWebhook as any)(req, res);

      // Debe haber llamado a answerCallbackQuery con la cédula desencriptada
      const answerCall = mocks.mockFetch.mock.calls.find((callArgs: any[]) =>
        callArgs[0].includes('answerCallbackQuery')
      );
      expect(answerCall).toBeDefined();

      const payload = JSON.parse(answerCall![1].body);
      expect(payload.callback_query_id).toBe('cb_ced');
      expect(payload.text).toBe(`🪪 Cédula del Cliente:\n\n${cedulaReal}`);
      expect(payload.show_alert).toBe(true);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('debe responder con advertencia si la cédula no existe o es de captura SIMIT', async () => {
      req.body = {
        callback_query: {
          id: 'cb_ced_err',
          from: { id: 111 },
          data: 'vercedula_doc_simit',
          message: { chat: { id: 999 }, message_id: 888 },
        },
      };

      mocks.mockFirestoreGet.mockResolvedValueOnce({ exists: false });
      mocks.mockFirestoreGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ cedula: 'SIMIT-CAPTURA' }),
      });

      await (telegramWebhook as any)(req, res);

      const answerCall = mocks.mockFetch.mock.calls.find((callArgs: any[]) =>
        callArgs[0].includes('answerCallbackQuery')
      );
      expect(answerCall).toBeDefined();

      const payload = JSON.parse(answerCall![1].body);
      expect(payload.callback_query_id).toBe('cb_ced_err');
      expect(payload.text).toBe('⚠️ Sin cédula registrada');
      expect(payload.show_alert).toBe(true);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('debe responder con error de seguridad genérico si falla el descifrado', async () => {
      req.body = {
        callback_query: {
          id: 'cb_ced_fail',
          from: { id: 111 },
          data: 'vercedula_doc_bad',
          message: { chat: { id: 999 }, message_id: 888 },
        },
      };

      mocks.mockFirestoreGet.mockResolvedValueOnce({ exists: false });
      // Formato cifrado inválido para provocar error en decryptSymmetric
      mocks.mockFirestoreGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ cedula: 'ENC:invalid_parts' }),
      });

      await (telegramWebhook as any)(req, res);

      const answerCall = mocks.mockFetch.mock.calls.find((callArgs: any[]) =>
        callArgs[0].includes('answerCallbackQuery')
      );
      expect(answerCall).toBeDefined();

      const payload = JSON.parse(answerCall![1].body);
      expect(payload.callback_query_id).toBe('cb_ced_fail');
      expect(payload.text).toBe('❌ Error de seguridad al descifrar cédula');
      expect(payload.show_alert).toBe(true);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

});
