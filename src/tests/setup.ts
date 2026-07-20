import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock global de fuentes de Next.js para evitar errores de importación de directorios en Vitest/ESM
process.env.RESEND_API_KEY = 're_test_dummy_key';
process.env.VIP_JWT_SECRET = 'test_vip_jwt_secret_1234567890';
process.env.CLIENT_PORTAL_JWT_SECRET =
  'd042cacfea4bf3c261c2517db7669474cd1d92023963d84e676866f7e1d99c9f78e507373b52a4524f0707dc47361aea83626029a0a04e4e4529e1ecbf5017cc';
process.env.PII_HMAC_SECRET = 'test_secret_salt_12345';
process.env.PII_ENCRYPTION_KEY = 'test_symmetric_encryption_key_123';
process.env.PII_ENCRYPTION_SALT =
  '8a4eaf5a1b4a11842358648ead688029a8ebd195f50eb84ae08da93d53064b19';
process.env.UPSTASH_REDIS_REST_URL = 'https://fake-redis-url.upstash.io';
process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-redis-token';

vi.mock('next/font/google', () => ({
  Inter: () => ({ className: 'mocked-inter', variable: '--font-inter' }),
  Instrument_Sans: () => ({ className: 'mocked-instrument', variable: '--font-instrument' }),
  Geist: () => ({ className: 'mocked-geist', variable: '--font-geist-sans' }),
}));

vi.mock('next/font/local', () => {
  return () => ({
    className: 'mocked-font-local',
    variable: '--font-local',
  });
});

// Mock específico para Geist para evitar el error ERR_UNSUPPORTED_DIR_IMPORT
vi.mock('geist/font/sans', () => ({
  GeistSans: {
    className: 'mocked-geist-sans',
    variable: '--font-geist-sans',
  },
}));
// Mock robusto de localStorage para entornos JSDoc/Node en Vitest
const mockStorage: Record<string, string> = {};
global.localStorage = {
  getItem: vi.fn((key: string) => mockStorage[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockStorage[key] = value;
  }),
  clear: vi.fn(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  }),
  removeItem: vi.fn((key: string) => {
    delete mockStorage[key];
  }),
  length: 0,
  key: vi.fn((index: number) => Object.keys(mockStorage)[index] || null),
};

// Mock de idb-keyval para Zustand Persist (soluciona ReferenceError: indexedDB is not defined)
vi.mock('idb-keyval', () => {
  const idbStore: Record<string, any> = {};
  return {
    get: vi.fn(async (key: string) => idbStore[key]),
    set: vi.fn(async (key: string, val: any) => {
      idbStore[key] = val;
    }),
    del: vi.fn(async (key: string) => {
      delete idbStore[key];
    }),
    clear: vi.fn(async () => {
      Object.keys(idbStore).forEach((k) => delete idbStore[k]);
    }),
  };
});
