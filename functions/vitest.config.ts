import { defineConfig } from 'vitest/config';

/**
 * Configuración de Vitest para los tests unitarios de Cloud Functions.
 * No requiere emulador activo — todos los tests usan mocks de firebase-admin.
 *
 * Para tests de integración con emulador real, ejecutar:
 * firebase emulators:exec "npx vitest run --config vitest.config.ts" --only firestore
 */
export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.test.ts'],
    globals: true,
    environment: 'node', // Node.js nativo, no jsdom (context de server-side)
  },
});
