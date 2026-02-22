import '@testing-library/jest-dom';

// jsdom no soporta ResizeObserver, requerido por Radix UI
if (typeof window !== 'undefined' && typeof window.ResizeObserver === 'undefined') {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
