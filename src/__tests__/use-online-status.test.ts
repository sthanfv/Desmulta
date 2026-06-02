/**
 * Tests: useOnlineStatus — Hook de detección de conectividad.
 * Valida: estado inicial, transición offline→online, flag wasOffline.
 *
 * Usa renderHook de @testing-library/react con JSDOM para simular eventos del navegador.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from '@/hooks/use-online-status';

// ── Helpers de test ───────────────────────────────────────────────────────────

function fireNetworkEvent(type: 'online' | 'offline') {
  window.dispatchEvent(new Event(type));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useOnlineStatus — Hook de conectividad', () => {
  beforeEach(() => {
    // Asegurar estado online por defecto
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllTimers();
  });

  it('reporta isOnline: true cuando navigator.onLine es true', () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current.isOnline).toBe(true);
  });

  it('cambia a isOnline: false cuando se dispara evento "offline"', () => {
    const { result } = renderHook(() => useOnlineStatus());

    act(() => {
      fireNetworkEvent('offline');
    });

    expect(result.current.isOnline).toBe(false);
  });

  it('restaura isOnline: true cuando se dispara evento "online"', () => {
    const { result } = renderHook(() => useOnlineStatus());

    act(() => {
      fireNetworkEvent('offline');
    });
    expect(result.current.isOnline).toBe(false);

    act(() => {
      fireNetworkEvent('online');
    });
    expect(result.current.isOnline).toBe(true);
  });

  it('activa wasOffline: true después de reconectar', () => {
    const { result } = renderHook(() => useOnlineStatus());

    act(() => {
      fireNetworkEvent('offline');
    });
    act(() => {
      fireNetworkEvent('online');
    });

    expect(result.current.wasOffline).toBe(true);
  });

  it('wasOffline regresa a false después de 5 segundos', () => {
    const { result } = renderHook(() => useOnlineStatus());

    act(() => {
      fireNetworkEvent('offline');
    });
    act(() => {
      fireNetworkEvent('online');
    });

    expect(result.current.wasOffline).toBe(true);

    act(() => {
      vi.advanceTimersByTime(6000); // Avanzar 6 segundos
    });

    expect(result.current.wasOffline).toBe(false);
  });

  it('wasOffline inicia como false en una sesión nueva', () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current.wasOffline).toBe(false);
  });
});
