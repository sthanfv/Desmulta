import { config } from 'dotenv';
import { resolve } from 'path';

// Cargar variables de entorno locales (.env.local)
config({ path: resolve(__dirname, '../.env.local') });
config({ path: resolve(__dirname, '../.env') });

import { logger } from '../src/lib/logger/security-logger';
import * as Sentry from '@sentry/nextjs';

async function run() {
  console.log('🚀 Iniciando simulacro de Crash de Frontend con Modo Dios (Sentry)...');
  
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 1.0,
  });
  
  // Simulamos exactamente lo que haría crash-report/route.ts
  const mockError = new Error("TypeError: Cannot read properties of undefined (reading 'map')");
  mockError.stack = `TypeError: Cannot read properties of undefined (reading 'map')
    at DataGrid (webpack-internal:///./src/components/ui/DataGrid.tsx:42:21)
    at renderWithHooks (webpack-internal:///./node_modules/react-dom/cjs/react-dom.development.js:15486:18)
    at mountIndeterminateComponent (webpack-internal:///./node_modules/react-dom/cjs/react-dom.development.js:20103:13)
    at beginWork (webpack-internal:///./node_modules/react-dom/cjs/react-dom.development.js:21626:16)`;
    
  const componentStack = `
    at DataGrid (webpack-internal:///./src/components/ui/DataGrid.tsx:15:3)
    at ErrorBoundary (webpack-internal:///./src/components/ui/ErrorBoundary.tsx:10:5)
    at div
    at DashboardLayout (webpack-internal:///./src/app/admin/layout.tsx:22:7)`;

  logger.error('Fallo Crítico de Frontend (Pantalla Rota)', {
    traceId: 'SIMULACRO-FRONTEND-99',
    endpoint: '/admin/dashboard/finanzas',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
    error: mockError.message,
    payload: {
      stack: mockError.stack,
      componentStack: componentStack,
    }
  });

  console.log('✅ Alerta enviada a Telegram. Revisa el chat para ver cómo llega la traza del error (stack) y la línea exacta.');
  
  // Esperar un poco para que el fetch asíncrono hacia Telegram se complete
  await new Promise(resolve => setTimeout(resolve, 2000));
}

run().catch(console.error);
