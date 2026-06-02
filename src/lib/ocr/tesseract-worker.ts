/**
 * TesseractWorker — Gestor de Singleton para el motor OCR.
 * MANDATO-FILTRO: Este módulo mantiene un único Worker vivo para evitar
 * latencias de inicialización (binario WASM y modelos tessdata).
 */
import { createWorker, Worker, RecognizeResult } from 'tesseract.js';
import { mediaLogger } from '@/lib/logger/media-logger';

export type { RecognizeResult };

interface LoggerMessage {
  status: string;
  progress: number;
  [key: string]: unknown;
}

class TesseractWorkerManager {
  private worker: Worker | null = null;
  public isBusy = false;
  private initializing: Promise<Worker> | null = null;

  /**
   * Inicializa el worker con un logger opcional en la fase de creación.
   * 🛡️ DEVSECOPS: El logger DEBE definirse aquí para evitar DataCloneError en postMessage.
   */
  async init(onProgress?: (m: LoggerMessage) => void): Promise<Worker> {
    if (typeof window === 'undefined') {
      return Promise.reject(new Error('[OCR] Intento de inicialización en el servidor bloqueado.'));
    }

    if (this.worker) return this.worker;
    if (this.initializing) return this.initializing;

    this.initializing = (async () => {
      try {
        mediaLogger.log('OCR', 'Iniciando creación de Worker (spa)...');
        const worker = await createWorker('spa', 1, {
          workerPath: '/tesseract/worker.min.js',
          langPath: '/tesseract/lang',
          corePath: '/tesseract/tesseract-core.wasm.js',
          logger: onProgress
            ? onProgress
            : (m) => {
                if (process.env.NODE_ENV === 'development' && m.status === 'recognizing text') {
                  // Log silencioso de progreso
                }
              },
        });

        this.worker = worker;
        mediaLogger.log('OCR', 'Worker listo para procesamiento');
        return worker;
      } catch (error) {
        this.initializing = null;
        mediaLogger.log('ERROR', 'Fallo crítico al crear Worker', { err: String(error) });
        console.error('[OCR] Error crítico al inicializar el Worker:', error);
        throw error;
      }
    })();

    return this.initializing;
  }

  /**
   * Realiza el reconocimiento de texto pasando ÚNICAMENTE la imagen (binario clonable).
   */
  async recognize(image: string | File): Promise<RecognizeResult> {
    if (!this.worker) {
      mediaLogger.log('ERROR', 'Intento de reconocimiento sin motor listo');
      throw new Error('Motor OCR no inicializado. Llama a init() primero.');
    }

    if (this.isBusy) {
      mediaLogger.log('ERROR', 'Motor OCR ocupado');
      throw new Error('El motor OCR está ocupado procesando otra imagen.');
    }

    try {
      this.isBusy = true;
      // 🛡️ DEVSECOPS: CERO funciones u opciones complejas aquí para evitar DataCloneError.
      const result = await this.worker.recognize(image);
      return result;
    } catch (err) {
      mediaLogger.log('ERROR', 'Fallo en worker.recognize', { err: String(err) });
      throw err;
    } finally {
      this.isBusy = false;
    }
  }

  /**
   * Finaliza el worker para liberar memoria (Prevención OOM).
   */
  async terminate() {
    if (this.worker) {
      mediaLogger.log('OCR', 'Terminando Worker para liberar memoria WASM');
      await this.worker.terminate();
      this.worker = null;
      this.initializing = null;
      this.isBusy = false;
    }
  }
}

export const tesseractManager = new TesseractWorkerManager();
