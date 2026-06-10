/**
 * 🔌 CircuitBreaker con Persistencia en Firestore — Desmulta
 *
 * PROBLEMA RESUELTO:
 * El CircuitBreaker original usaba estado en memoria del proceso Node.js.
 * En Vercel Serverless, cada función es efímera: un cold start resetea el estado a CLOSED,
 * anulando completamente la protección. Un servicio roto que dispara el CircuitBreaker
 * en una instancia seguirá recibiendo peticiones desde otras instancias paralelas.
 *
 * SOLUCIÓN:
 * Se persiste el estado del CircuitBreaker en Firestore (colección 'circuit_breakers').
 * Cada servicio tiene un documento con el conteo de fallos y el timestamp de apertura.
 * La latencia añadida (~1-5ms por lectura) es aceptable dado que los servicios protegidos
 * (OCR, Firebase) ya tienen latencias de 100ms+.
 *
 * DOCUMENTO EN FIRESTORE:
 * circuit_breakers/{serviceName} → { failureCount: number, openedAt: number | null }
 *
 * COMPATIBILIDAD:
 * Esta implementación NO modifica la clase CircuitBreaker original. Solo provee
 * instancias alternativas que usan Firestore como backend de estado.
 */

import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';
import { SecurityLogger } from '@/lib/logger/security-logger';

export type CircuitStateFs = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerFsOptions {
  /** Nombre único del servicio protegido. Usado como ID del documento en Firestore. */
  serviceName: string;
  /** Número de fallos consecutivos para abrir el circuito. Por defecto: 3. */
  failureThreshold?: number;
  /** Tiempo en ms que el circuito permanece abierto antes de pasar a HALF_OPEN. Por defecto: 60000ms. */
  resetTimeoutMs?: number;
}

interface CircuitBreakerFsDoc {
  failureCount: number;
  openedAt: number | null;
  updatedAt: number;
}

/**
 * CircuitBreaker con backend de estado en Firestore.
 * Diseñado para sobrevivir cold starts en entornos serverless.
 */
export class CircuitBreakerFs {
  private readonly serviceName: string;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;

  constructor(options: CircuitBreakerFsOptions) {
    this.serviceName = options.serviceName;
    this.failureThreshold = options.failureThreshold ?? 3;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 60000;
  }

  /**
   * Obtiene una referencia al documento del circuito en Firestore.
   * Usa getAdminApp() para garantizar que Firebase Admin esté inicializado.
   */
  private getDocRef() {
    getAdminApp();
    const db = getFirestore();
    return db.collection('circuit_breakers').doc(this.serviceName);
  }

  /**
   * Lee el estado actual del circuito desde Firestore.
   * Si el circuito estaba OPEN y ya expiró el timeout, retorna HALF_OPEN.
   *
   * @returns Estado actual del circuito.
   */
  async getState(): Promise<CircuitStateFs> {
    try {
      const snap = await this.getDocRef().get();

      if (!snap.exists) {
        return 'CLOSED';
      }

      const data = snap.data() as CircuitBreakerFsDoc;

      // Si hay openedAt, el circuito fue abierto
      if (data.openedAt !== null && data.openedAt !== undefined) {
        const tiempoAbierto = Date.now() - data.openedAt;
        if (tiempoAbierto >= this.resetTimeoutMs) {
          SecurityLogger.info(`[CircuitBreakerFs] ${this.serviceName} transiciona a HALF_OPEN tras ${tiempoAbierto}ms`);
          return 'HALF_OPEN';
        }
        return 'OPEN';
      }

      return 'CLOSED';
    } catch (err) {
      // Si no podemos leer el estado, asumimos CLOSED para no bloquear el servicio
      SecurityLogger.warn(`[CircuitBreakerFs] ${this.serviceName} — Error al leer estado, asumiendo CLOSED`, err);
      return 'CLOSED';
    }
  }

  /**
   * Verifica si el circuito está abierto (bloquea peticiones).
   */
  async isOpen(): Promise<boolean> {
    return (await this.getState()) === 'OPEN';
  }

  /**
   * Registra un fallo en el servicio protegido.
   * Si se supera el umbral, abre el circuito.
   */
  async recordFailure(error?: unknown): Promise<void> {
    try {
      const ref = this.getDocRef();
      const snap = await ref.get();
      const data = snap.exists ? (snap.data() as CircuitBreakerFsDoc) : { failureCount: 0, openedAt: null, updatedAt: Date.now() };
      const nuevoConteo = (data.failureCount ?? 0) + 1;

      SecurityLogger.warn(
        `[CircuitBreakerFs] ${this.serviceName} falló (${nuevoConteo}/${this.failureThreshold})`,
        error
      );

      const debeAbrirse = nuevoConteo >= this.failureThreshold;

      await ref.set(
        {
          failureCount: nuevoConteo,
          // Abrir el circuito si se supera el umbral o si ya estaba en HALF_OPEN y vuelve a fallar
          openedAt: debeAbrirse ? Date.now() : (data.openedAt ?? null),
          updatedAt: Date.now(),
        },
        { merge: true }
      );

      if (debeAbrirse) {
        SecurityLogger.error(
          `[CircuitBreakerFs] ${this.serviceName} transiciona a OPEN. Bloqueando por ${this.resetTimeoutMs}ms.`
        );
      }
    } catch (err) {
      SecurityLogger.warn(`[CircuitBreakerFs] ${this.serviceName} — Error al registrar fallo`, err);
    }
  }

  /**
   * Registra un éxito y cierra el circuito (resetea contadores).
   */
  async recordSuccess(): Promise<void> {
    try {
      const currentState = await this.getState();
      if (currentState === 'HALF_OPEN' || currentState === 'OPEN') {
        SecurityLogger.info(`[CircuitBreakerFs] ${this.serviceName} recuperado. Transiciona a CLOSED.`);
      }
      // Eliminar el documento es el equivalente a "CLOSED con 0 fallos"
      await this.getDocRef().delete();
    } catch (err) {
      SecurityLogger.warn(`[CircuitBreakerFs] ${this.serviceName} — Error al registrar éxito`, err);
    }
  }
}

/**
 * Instancias globales pre-configuradas con persistencia en Firestore.
 * Reemplazan a OcrCircuitBreaker y FirebaseCircuitBreaker del módulo original
 * para funcionar correctamente en entornos serverless (Vercel).
 */
export const OcrCircuitBreakerFs = new CircuitBreakerFs({
  serviceName: 'OCR_SERVICE',
  failureThreshold: 3,
  resetTimeoutMs: 60000,
});

export const FirebaseCircuitBreakerFs = new CircuitBreakerFs({
  serviceName: 'FIREBASE_SERVICE',
  failureThreshold: 3,
  resetTimeoutMs: 30000,
});
