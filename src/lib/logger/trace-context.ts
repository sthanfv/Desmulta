import { AsyncLocalStorage } from 'async_hooks';

export interface TraceContext {
  traceId: string;
  ip: string;
  userAgent: string;
  path: string;
  host: string;
}

export const traceStorage = new AsyncLocalStorage<TraceContext>();

/**
 * Obtiene el contexto de trazabilidad actual.
 */
export function getTraceContext(): TraceContext | undefined {
  return traceStorage.getStore();
}

/**
 * Ejecuta una función dentro de un contexto de trazabilidad.
 */
export function withTraceContext<T>(context: TraceContext, fn: () => T): T {
  return traceStorage.run(context, fn);
}
