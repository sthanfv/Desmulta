'use client';

/**
 * MediaLogger — Singleton de Telemetría para Operaciones Binarias (v7.4.8)
 * MANDATO-FILTRO: Documenta el ciclo de vida de archivos, OCR y compresión
 * para diagnosticar fallos silenciosos en Android/Safari.
 *
 * v7.4.8 — Mejoras de Precisión:
 * - `elapsedMs`: Tiempo transcurrido desde el evento anterior (diagnóstico de cuellos de botella).
 * - `networkType`: Tipo de conexión real del dispositivo (WiFi, 4G, 2G...).
 * - Fase de arranque incluye información de red para correlacionar tiempos con conectividad.
 */

export interface MediaLogEvent {
  id: number;
  time: string;
  /** Milisegundos desde el evento anterior (0 en el primero). */
  elapsedMs: number;
  type: 'FILE' | 'COMPRESSION' | 'OCR' | 'UPLOAD' | 'ERROR';
  message: string;
  details?: Record<string, unknown>;
}

class MediaLoggerManager {
  private logs: MediaLogEvent[] = [];
  private logId = 0;
  private maxLogs = 50;
  /** Timestamp del último evento para calcular deltas de tiempo. */
  private lastEventTimestamp = 0;

  log(type: MediaLogEvent['type'], message: string, details?: Record<string, unknown>) {
    const now = Date.now();
    const elapsedMs = this.lastEventTimestamp > 0 ? now - this.lastEventTimestamp : 0;
    this.lastEventTimestamp = now;

    const newLog: MediaLogEvent = {
      id: ++this.logId,
      time: new Date().toISOString().split('T')[1].slice(0, 11),
      elapsedMs,
      type,
      message,
      details,
    };

    this.logs = [newLog, ...this.logs.slice(0, this.maxLogs - 1)];

    if (process.env.NODE_ENV === 'development') {
      const delta = elapsedMs > 0 ? ` (+${elapsedMs}ms)` : '';
      console.log(`[MediaLogger] [${type}]${delta} ${message}`, details || '');
    }
  }

  getLogs() {
    return this.logs;
  }

  clear() {
    this.logs = [];
    this.logId = 0;
    this.lastEventTimestamp = 0;
  }

  /** Captura el estado del dispositivo incluyendo el tipo de conexión de red. */
  getDeviceInfo() {
    if (typeof window === 'undefined') return {};
    const nav = navigator as Navigator & {
      deviceMemory?: number;
      connection?: { effectiveType?: string; downlink?: number; rtt?: number };
    };

    const conn = nav.connection;
    const networkInfo = conn
      ? {
          networkType: conn.effectiveType || 'unknown',
          downlinkMbps: conn.downlink ?? 'unknown',
          rttMs: conn.rtt ?? 'unknown',
        }
      : { networkType: 'API no disponible' };

    return {
      ua: nav.userAgent,
      ram: nav.deviceMemory || 'unknown',
      cores: nav.hardwareConcurrency || 'unknown',
      screen: `${window.innerWidth}x${window.innerHeight}`,
      ...networkInfo,
    };
  }

  /** Captura avanzada (Asíncrona) para identificar el modelo real en Android y evadir reducción de UA. */
  async getDetailedDeviceInfo() {
    const base = this.getDeviceInfo();
    if (typeof window === 'undefined') return base;

    const nav = navigator as Navigator & {
      userAgentData?: {
        platform: string;
        getHighEntropyValues: (hints: string[]) => Promise<Record<string, string>>;
      };
    };
    if (nav.userAgentData && nav.userAgentData.getHighEntropyValues) {
      try {
        const hints = await nav.userAgentData.getHighEntropyValues(['platformVersion', 'model']);
        return {
          ...base,
          realOS: `${nav.userAgentData.platform} ${hints.platformVersion || ''}`,
          model: hints.model || 'unknown',
        };
      } catch {
        return base;
      }
    }
    return base;
  }
}

export const mediaLogger = new MediaLoggerManager();
