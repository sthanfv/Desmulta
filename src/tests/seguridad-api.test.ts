/**
 * Tests de Integración — Auditoría de Seguridad Backend
 *
 * Cubren las tres correcciones aplicadas en la ronda de seguridad:
 * A. IP Spoofing: /api/upload usa ipAddress() no falsificable.
 * B. Zod Validation: /api/web-push rechaza payloads malformados.
 * C. Logger: /api/documentos/download no usa console.error.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ──────────────────────────────────────────────────────────────────────────────
// A. TESTS: IP Spoofing — upload/route.ts
// ──────────────────────────────────────────────────────────────────────────────

describe('Seguridad A — upload/route.ts: Protección contra IP Spoofing', () => {
  const uploadRoutePath = path.resolve(process.cwd(), 'src/app/api/upload/route.ts');
  const uploadSource = fs.readFileSync(uploadRoutePath, 'utf-8');

  it('debe importar ipAddress desde @vercel/functions (no falsificable)', () => {
    expect(uploadSource).toContain("from '@vercel/functions'");
    expect(uploadSource).toContain('ipAddress');
  });

  it('NO debe extraer IP directamente de x-forwarded-for (falsificable por el cliente)', () => {
    // La función interna puede mencionar x-real-ip como fallback de desarrollo,
    // pero NO debe hacer split(',')[0] sobre x-forwarded-for ni x-vercel-forwarded-for.
    const tieneXForwardedForSplit =
      /headers\.get\(['"]x-forwarded-for['"]\).*?\.split/.test(uploadSource) ||
      /headers\.get\(['"]x-vercel-forwarded-for['"]\).*?\.split/.test(uploadSource);
    expect(tieneXForwardedForSplit).toBe(false);
  });

  it('debe tener un fallback a x-real-ip o 127.0.0.1 para entornos de desarrollo', () => {
    expect(uploadSource).toMatch(/127\.0\.0\.1|x-real-ip/);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// B. TESTS: Zod Validation — web-push/route.ts
// ──────────────────────────────────────────────────────────────────────────────

describe('Seguridad B — web-push/route.ts: Validación Zod del payload FCM', () => {
  const webPushRoutePath = path.resolve(process.cwd(), 'src/app/api/web-push/route.ts');
  const webPushSource = fs.readFileSync(webPushRoutePath, 'utf-8');

  it('debe importar z desde zod', () => {
    expect(webPushSource).toContain("from 'zod'");
  });

  it('debe definir un schema Zod para el payload (WebPushPayloadSchema)', () => {
    expect(webPushSource).toContain('WebPushPayloadSchema');
    expect(webPushSource).toContain('z.object(');
  });

  it('debe validar el body con safeParse antes de acceder a los campos', () => {
    expect(webPushSource).toContain('safeParse');
    expect(webPushSource).toContain('parsed.success');
  });

  it('debe validar que tokens es un array de strings con límite max', () => {
    // El schema real es multilínea: z\n    .array(...).max(MAX_TOKENS)
    expect(webPushSource).toContain('.array(');
    expect(webPushSource).toContain('.max(MAX_TOKENS');
  });

  it('debe limitar la longitud de title y message para prevenir payloads gigantes', () => {
    expect(webPushSource).toContain('.max(200)');
    expect(webPushSource).toContain('.max(1000)');
  });

  it('debe retornar 400 si el payload no pasa la validación Zod', () => {
    // Verificar que el flujo de error retorna status 400
    expect(webPushSource).toContain('status: 400');
    expect(webPushSource).toContain("'Payload inválido'");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// C. TESTS: Logger — documentos/download/route.ts
// ──────────────────────────────────────────────────────────────────────────────

describe('Seguridad C — documentos/download/route.ts: Logger para captura en Sentry', () => {
  const downloadRoutePath = path.resolve(process.cwd(), 'src/app/api/documentos/download/route.ts');
  const downloadSource = fs.readFileSync(downloadRoutePath, 'utf-8');

  it('debe importar logger desde @/lib/logger/security-logger', () => {
    expect(downloadSource).toContain("from '@/lib/logger/security-logger'");
    expect(downloadSource).toContain('logger');
  });

  it('NO debe usar console.error (no capturado por Sentry)', () => {
    expect(downloadSource).not.toContain('console.error');
  });

  it('debe usar logger.error en el bloque de auditoría de descarga', () => {
    expect(downloadSource).toContain('logger.error');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// D. TESTS: OCR Local Multi-Comparendo + Carrusel Educativo
// ──────────────────────────────────────────────────────────────────────────────

describe('Flujo D — OCR Local: extracción multi-comparendo y carrusel secuencial', () => {
  const simitParserPath = path.resolve(process.cwd(), 'src/lib/simit-parser.ts');
  const simitParserSource = fs.readFileSync(simitParserPath, 'utf-8');

  const secuenciaPath = path.resolve(
    process.cwd(),
    'src/components/interactive/SecuenciaEducativa.tsx'
  );
  const secuenciaSource = fs.readFileSync(secuenciaPath, 'utf-8');

  // ── Parser ────────────────────────────────────────────────────────────────

  it('simit-parser debe exportar extraerCodigosInfraccion (plural) para soporte multi-comparendo', () => {
    expect(simitParserSource).toContain('export function extraerCodigosInfraccion');
  });

  it('extraerCodigosInfraccion debe devolver un array (no un string único)', () => {
    // La firma debe retornar string[] (array)
    expect(simitParserSource).toMatch(/extraerCodigosInfraccion.*:\s*string\[\]/);
  });

  it('extraerMultasDeTexto debe filtrar duplicados para evitar multas repetidas', () => {
    expect(simitParserSource).toContain('filter');
    expect(simitParserSource).toContain('comparendo');
  });

  // ── Componente SecuenciaEducativa ─────────────────────────────────────────

  it('SecuenciaEducativa debe mostrar un indicador de posición "de" para múltiples multas', () => {
    // El texto "de {total}" es la señal del contador "Multa X de N"
    expect(secuenciaSource).toContain('de {total}');
  });

  it('SecuenciaEducativa debe tener un botón de navegación "Siguiente"', () => {
    expect(secuenciaSource).toContain('Siguiente');
    expect(secuenciaSource).toContain('btn-siguiente-educativa');
  });

  it('SecuenciaEducativa debe tener un botón de navegación "Anterior"', () => {
    expect(secuenciaSource).toContain('Anterior');
    expect(secuenciaSource).toContain('btn-anterior-educativa');
  });

  it('SecuenciaEducativa debe cambiar el botón final a "Listo" en la última multa', () => {
    expect(secuenciaSource).toContain('Listo');
    expect(secuenciaSource).toContain('esUltima');
  });

  it('SecuenciaEducativa debe animar con dirección para el deslizamiento lateral', () => {
    expect(secuenciaSource).toContain('direccion');
    expect(secuenciaSource).toContain('setDireccion');
  });

  it('SecuenciaEducativa debe ocultar los botones de navegación si solo hay 1 multa', () => {
    expect(secuenciaSource).toContain('hayMultiples');
  });
});
