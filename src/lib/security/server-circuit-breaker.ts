import { CircuitBreaker, CircuitBreakerOptions, CircuitState } from './circuit-breaker';
import { Redis } from '@upstash/redis';
import { SecurityLogger } from '../logger/security-logger';

/**
 * ServerCircuitBreaker extiende el CircuitBreaker base (en memoria) para añadir
 * sincronización "Fire and Forget" con Upstash Redis.
 *
 * ¿Por qué esta arquitectura?
 * 1. Firebase Admin (`getAdminApp`) DEBE ser síncrono. No podemos hacer un `await redis.get()`
 *    en cada inicialización sin romper todo el backend.
 * 2. Al mantener `getState()` síncrono leyendo de la RAM, mantenemos latencia 0.
 * 3. En segundo plano, `pullState()` y `pushState()` sincronizan la RAM de este
 *    contenedor de Vercel con el Redis global.
 * 4. Si Redis se cae, los bloques try/catch atrapan el error silenciosamente (Fail-Open)
 *    y el CircuitBreaker sigue funcionando con su memoria local intacta.
 */
export class ServerCircuitBreaker extends CircuitBreaker {
  private redis: Redis | null = null;
  private syncInProgress = false;

  constructor(options: CircuitBreakerOptions) {
    super(options);
    try {
      // Solo inicializar Redis si estamos en servidor y hay credenciales
      if (
        typeof window === 'undefined' &&
        process.env.UPSTASH_REDIS_REST_URL &&
        process.env.UPSTASH_REDIS_REST_TOKEN
      ) {
        this.redis = Redis.fromEnv();
        // Sincronización en frío al iniciar el contenedor Vercel
        this.pullState().catch(() => {});
      }
    } catch (_e) {
      SecurityLogger.warn(
        `[ServerCircuitBreaker] Redis no disponible para ${options.serviceName}. Fail-Open a memoria local.`
      );
    }
  }

  /**
   * Obtiene el estado de Redis y lo aplica a la memoria local.
   */
  public async pullState(): Promise<void> {
    if (!this.redis || this.syncInProgress) return;
    this.syncInProgress = true;
    try {
      // Necesitamos hacer cast o acceder a las propiedades privadas protegidas por TypeScript.
      // Usamos any para acceder a this.serviceName de forma limpia en tiempo de ejecución.
      const serviceName = (this as unknown as { serviceName: string }).serviceName;

      const remoteState = await this.redis.get<CircuitState>(`circuit:${serviceName}:state`);

      if (remoteState === 'OPEN' && this.getState() !== 'OPEN') {
        SecurityLogger.warn(
          `[ServerCircuitBreaker] Estado global OPEN detectado en Redis. Forzando apertura local.`
        );
        super.forceOpen();
      } else if (remoteState === 'CLOSED' && this.getState() === 'OPEN') {
        SecurityLogger.info(
          `[ServerCircuitBreaker] Estado global CLOSED detectado en Redis. Forzando cierre local.`
        );
        super.forceClosed();
      }
    } catch (_e) {
      // Fail-open silencioso si falla Redis
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Empuja el estado local hacia Redis de forma asíncrona.
   */
  private async pushState(state: CircuitState): Promise<void> {
    if (!this.redis) return;
    try {
      const serviceName = (this as unknown as { serviceName: string }).serviceName;
      const resetTimeoutMs = (this as unknown as { resetTimeoutMs: number }).resetTimeoutMs;
      // Guardamos el estado con un TTL (Time-To-Live) igual al resetTimeout
      // para que se limpie automáticamente de Redis
      await this.redis.set(`circuit:${serviceName}:state`, state, { px: resetTimeoutMs });
    } catch (_e) {
      // Fail-open silencioso
    }
  }

  public recordFailure(error?: unknown): void {
    super.recordFailure(error);
    const state = this.getState();
    if (state === 'OPEN') {
      // Si el fallo local abrió el circuito, informar al mundo (Redis)
      this.pushState(state).catch(() => {});
    }
  }

  public recordSuccess(): void {
    const wasOpen = this.getState() !== 'CLOSED';
    super.recordSuccess();
    if (wasOpen) {
      // Si un éxito local cerró el circuito, informar al mundo
      this.pushState('CLOSED').catch(() => {});
    }
  }
}

// Instancia global robusta para el sistema de Firebase
export const FirebaseCircuitBreakerGlobal = new ServerCircuitBreaker({
  serviceName: 'FIREBASE_SERVICE',
  failureThreshold: 3,
  resetTimeoutMs: 30000,
});
