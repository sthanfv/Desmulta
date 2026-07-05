import { SecurityLogger } from '@/lib/logger/security-logger';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeoutMs?: number;
  serviceName: string;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount: number = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private nextAttemptMs: number = 0;
  private readonly serviceName: string;
  private listeners: ((state: CircuitState) => void)[] = [];

  constructor(options: CircuitBreakerOptions) {
    this.failureThreshold = options.failureThreshold || 3;
    this.resetTimeoutMs = options.resetTimeoutMs || 30000; // 30s by default
    this.serviceName = options.serviceName;
  }

  public getState(): CircuitState {
    if (this.state === 'OPEN') {
      if (Date.now() > this.nextAttemptMs) {
        this.state = 'HALF_OPEN';
        SecurityLogger.info(`[CircuitBreaker] ${this.serviceName} transiciona a HALF_OPEN`);
        this.notifyListeners();
      }
    }
    return this.state;
  }

  public recordSuccess(): void {
    const prevState = this.state;
    if (this.state === 'HALF_OPEN' || this.state === 'OPEN') {
      SecurityLogger.info(`[CircuitBreaker] ${this.serviceName} recuperado. Transiciona a CLOSED.`);
    }
    this.state = 'CLOSED';
    this.failureCount = 0;
    if (prevState !== this.state) this.notifyListeners();
  }

  public recordFailure(error?: unknown): void {
    this.failureCount += 1;
    SecurityLogger.warn(
      `[CircuitBreaker] ${this.serviceName} falló (${this.failureCount}/${this.failureThreshold})`,
      error
    );

    if (this.state === 'CLOSED' && this.failureCount >= this.failureThreshold) {
      this.trip();
    } else if (this.state === 'HALF_OPEN') {
      // Si falla en half-open, se abre de nuevo inmediatamente
      this.trip();
    }
  }

  private trip(): void {
    const prevState = this.state;
    this.state = 'OPEN';
    this.nextAttemptMs = Date.now() + this.resetTimeoutMs;
    SecurityLogger.error(
      `[CircuitBreaker] ${this.serviceName} transiciona a OPEN. Bloqueando peticiones por ${this.resetTimeoutMs}ms.`
    );
    if (prevState !== this.state) this.notifyListeners();
  }

  public isOpen(): boolean {
    return this.getState() === 'OPEN';
  }

  public forceOpen(): void {
    this.trip();
  }

  public forceClosed(): void {
    const prevState = this.state;
    this.state = 'CLOSED';
    this.failureCount = 0;
    SecurityLogger.info(`[CircuitBreaker] ${this.serviceName} forzado manualmente a CLOSED.`);
    if (prevState !== this.state) this.notifyListeners();
  }

  public subscribe(listener: (state: CircuitState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.state));
  }
}

// Instancias globales pre-configuradas para los servicios críticos
export const OcrCircuitBreaker = new CircuitBreaker({
  serviceName: 'OCR_SERVICE',
  failureThreshold: 3,
  resetTimeoutMs: 60000,
});
export const FirebaseCircuitBreaker = new CircuitBreaker({
  serviceName: 'FIREBASE_SERVICE',
  failureThreshold: 3,
  resetTimeoutMs: 30000,
});
