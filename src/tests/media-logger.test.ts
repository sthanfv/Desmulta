import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mediaLogger } from '@/lib/logger/media-logger';

describe('📱 Telemetría: Engine de MediaLogger (Forense y Zero-PII)', () => {
  beforeEach(() => {
    mediaLogger.clear();
  });

  it('✅ Debe registrar y almacenar logs con tipos correctos', () => {
    mediaLogger.log('FILE', 'Archivo pdf subido para OCR');
    mediaLogger.log('COMPRESSION', 'Reduciendo tamaño a 500kb');
    mediaLogger.log('OCR', 'Infracción leída con 95% certeza');
    mediaLogger.log('ERROR', 'Fallo al procesar imagen');

    const logs = mediaLogger.getLogs();
    expect(logs).toHaveLength(4);

    expect(logs[0].type).toBe('ERROR');
    expect(logs[0].message).toBe('Fallo al procesar imagen');

    expect(logs[1].type).toBe('OCR');
    expect(logs[1].message).toBe('Infracción leída con 95% certeza');

    expect(logs[2].type).toBe('COMPRESSION');
    expect(logs[3].type).toBe('FILE');
  });

  it('✅ Debe calcular correctamente elapsedMs entre logs sucesivos', async () => {
    mediaLogger.log('FILE', 'Primer evento');

    // Simular un delay
    await new Promise((resolve) => setTimeout(resolve, 50));

    mediaLogger.log('COMPRESSION', 'Segundo evento');

    const logs = mediaLogger.getLogs();
    expect(logs[0].elapsedMs).toBeGreaterThanOrEqual(40); // Alrededor de 50ms
  });

  it('✅ Debe limitar el almacenamiento a un máximo de 50 logs para prevenir fugas de memoria', () => {
    for (let i = 0; i < 60; i++) {
      mediaLogger.log('FILE', `Log número ${i}`);
    }

    const logs = mediaLogger.getLogs();
    expect(logs).toHaveLength(50);
    // El último log debe ser el número 59
    expect(logs[0].message).toBe('Log número 59');
  });

  it('✅ Debe limpiar los logs correctamente al llamar clear()', () => {
    mediaLogger.log('FILE', 'Primer evento');
    mediaLogger.log('OCR', 'Segundo evento');

    expect(mediaLogger.getLogs()).toHaveLength(2);

    mediaLogger.clear();
    expect(mediaLogger.getLogs()).toHaveLength(0);
  });

  it('✅ Debe recuperar información básica del dispositivo y conexión de red', () => {
    const info = mediaLogger.getDeviceInfo();

    expect(info).toHaveProperty('ua');
    expect(info).toHaveProperty('screen');
    expect(info).toHaveProperty('networkType');
  });
});
