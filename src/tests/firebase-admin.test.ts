import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAdminApp } from '../lib/firebase-admin';
import { FirebaseCircuitBreakerGlobal as FirebaseCircuitBreaker } from '../lib/security/server-circuit-breaker';

vi.mock('firebase-admin/app', () => ({
  getApps: vi.fn(() => []),
  initializeApp: vi.fn(() => {
    throw new Error('Mock Initialization Error');
  }),
  cert: vi.fn(),
}));

describe('Firebase Admin Circuit Breaker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    FirebaseCircuitBreaker.forceClosed();
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@example.com';
    process.env.FIREBASE_PRIVATE_KEY =
      '-----BEGIN PRIVATE KEY-----\nMockKey\n-----END PRIVATE KEY-----';
  });

  it('debería abrir el circuit breaker después de 3 fallos consecutivos', () => {
    // Intento 1
    expect(() => getAdminApp()).toThrow('Mock Initialization Error');
    expect(FirebaseCircuitBreaker.getState()).toBe('CLOSED');

    // Intento 2
    expect(() => getAdminApp()).toThrow('Mock Initialization Error');
    expect(FirebaseCircuitBreaker.getState()).toBe('CLOSED');

    // Intento 3 - Aquí se debe abrir el circuito
    expect(() => getAdminApp()).toThrow('Mock Initialization Error');
    expect(FirebaseCircuitBreaker.getState()).toBe('OPEN');

    // Intento 4 - El error ahora debe ser del circuito abierto, no de firebase
    expect(() => getAdminApp()).toThrow(
      'FIREBASE_CIRCUIT_OPEN: Firebase service is currently unavailable.'
    );
  });
});
