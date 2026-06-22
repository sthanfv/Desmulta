import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
      },
      include: [
        'src/lib/security/**',
        'src/lib/legal/**',
        'src/app/api/**',
      ],
    },
    include: [
      '**/__tests__/**/*.test.{ts,tsx,js}',
      'src/tests/**/*.test.{ts,tsx}',
      'tests/**/*.test.{ts,tsx}',  // tests/unit/ — parseo SIMIT y mandatos legales
    ],
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    globalTeardown: './src/tests/teardown.ts',
    exclude: [
      '**/node_modules/**',
      '**/src/tests/e2e/**',
      '**/tests/e2e/**',
      // Requiere emulador de Firebase (@firebase/rules-unit-testing). Ejecutar con: npm run test:integration
      '**/__tests__/firestore-security.test.js',
      // Requiere emulador Firestore activo en localhost:8080. Ejecutar con: npm run test:integration
      '**/tests/integration/kanban.test.ts',
      '**/functions/lib/**',
    ],
  },
});
