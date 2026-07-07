import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Config — Desmulta v8.1.0
 * 
 * ESTRATEGIA DE TESTEO:
 * - Puerto 9005 (MANDATO-FILTRO para coincidir con `npm run dev`).
 * - Cobertura Chromium para ruta crítica (SIMIT -> PDF).
 * - Paralelismo habilitado para velocidad de ejecución en CI.
 */

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  /* Reintentos limitados para evitar falsos positivos en entornos de red lentos */
  retries: process.env.CI ? 2 : 1,
  /* Límite de workers para no saturar la CPU en CI */
  workers: process.env.CI ? 2 : undefined,
  reporter: 'html',
  timeout: 120000,
  
  use: {
    /* Puerto 9005: Crucial para conectar con el servidor Next.js del proyecto */
    baseURL: 'http://localhost:9005',
    
    /* Grabación de trazas solo en el primer reintento (ahorro de disco) */
    trace: 'on-first-retry',
    
    /* Captura de pantalla si falla el test */
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Configuración del Servidor de Pruebas */
  webServer: {
    command: 'cross-env NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true SUPERADMIN_AUDIT_PASSWORD=testpassword123 GOD_MODE_JWT_SECRET=testjwtsecret123 npm run dev',
    url: 'http://localhost:9005',
    reuseExistingServer: false,
    timeout: 120 * 1000, // 120s para dar tiempo al build de Next.js
  },
});
