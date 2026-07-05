import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CircuitBreaker } from '@/lib/security/circuit-breaker';

describe('CircuitBreaker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize in CLOSED state', () => {
    const breaker = new CircuitBreaker({ serviceName: 'TEST_SERVICE', failureThreshold: 3, resetTimeoutMs: 1000 });
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('should transition to OPEN after reaching failure threshold', () => {
    const breaker = new CircuitBreaker({ serviceName: 'TEST_SERVICE', failureThreshold: 3, resetTimeoutMs: 1000 });
    
    breaker.recordFailure();
    expect(breaker.getState()).toBe('CLOSED');
    
    breaker.recordFailure();
    expect(breaker.getState()).toBe('CLOSED');
    
    breaker.recordFailure();
    expect(breaker.getState()).toBe('OPEN');
  });

  it('should transition to HALF_OPEN after resetTimeout', () => {
    const breaker = new CircuitBreaker({ serviceName: 'TEST_SERVICE', failureThreshold: 3, resetTimeoutMs: 1000 });
    
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.getState()).toBe('OPEN');

    vi.advanceTimersByTime(1001);
    expect(breaker.getState()).toBe('HALF_OPEN');
  });

  it('should reset to CLOSED on success when HALF_OPEN', () => {
    const breaker = new CircuitBreaker({ serviceName: 'TEST_SERVICE', failureThreshold: 1, resetTimeoutMs: 1000 });
    
    breaker.recordFailure();
    expect(breaker.getState()).toBe('OPEN');

    vi.advanceTimersByTime(1001);
    expect(breaker.getState()).toBe('HALF_OPEN');

    breaker.recordSuccess();
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('should revert to OPEN on failure when HALF_OPEN', () => {
    const breaker = new CircuitBreaker({ serviceName: 'TEST_SERVICE', failureThreshold: 1, resetTimeoutMs: 1000 });
    
    breaker.recordFailure();
    expect(breaker.getState()).toBe('OPEN');

    vi.advanceTimersByTime(1001);
    expect(breaker.getState()).toBe('HALF_OPEN');

    breaker.recordFailure();
    expect(breaker.getState()).toBe('OPEN');
  });

  it('should track sequential successes and reset failure count', () => {
    const breaker = new CircuitBreaker({ serviceName: 'TEST_SERVICE', failureThreshold: 2, resetTimeoutMs: 1000 });
    
    breaker.recordFailure();
    breaker.recordSuccess();
    breaker.recordFailure();
    
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('should notify listeners on state changes', () => {
    const breaker = new CircuitBreaker({ serviceName: 'TEST_SERVICE', failureThreshold: 1, resetTimeoutMs: 1000 });
    const listener = vi.fn();
    breaker.subscribe(listener);

    breaker.recordFailure(); // To OPEN
    expect(listener).toHaveBeenCalledWith('OPEN');

    vi.advanceTimersByTime(1001); // State changes on next check, but we need to trigger it
    breaker.getState(); // This triggers HALF_OPEN
    
    expect(listener).toHaveBeenCalledWith('HALF_OPEN'); 
    
    breaker.recordSuccess(); // To CLOSED
    expect(listener).toHaveBeenCalledWith('CLOSED');
  });

  it('should force circuit to CLOSED and reset failures when forceClosed is called', () => {
    const breaker = new CircuitBreaker({ serviceName: 'TEST_SERVICE', failureThreshold: 3, resetTimeoutMs: 1000 });
    const listener = vi.fn();
    breaker.subscribe(listener);

    // Provocamos el fallo
    breaker.forceOpen();
    expect(breaker.getState()).toBe('OPEN');
    expect(listener).toHaveBeenCalledWith('OPEN');

    // Forzamos el cierre manual
    breaker.forceClosed();
    expect(breaker.getState()).toBe('CLOSED');
    expect(listener).toHaveBeenCalledWith('CLOSED');

    // Si fallamos una vez más, no debería abrirse porque los contadores se resetearon
    breaker.recordFailure();
    expect(breaker.getState()).toBe('CLOSED');
  });
});
