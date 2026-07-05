/**
 * Test Unitario — SuccessCases.tsx (Skeleton + Intersection Observer)
 * Desmulta v8.11.0
 *
 * Valida el comportamiento lazy del fetch a /api/gallery:
 * 1. El fetch NO se llama si la sección no es visible en el viewport.
 * 2. El fetch SÍ se llama cuando isIntersecting = true.
 * 3. El skeleton se muestra mientras isLoading = true.
 * 4. Las tarjetas se muestran cuando isLoading = false y hay datos dinámicos.
 * 5. El fallback estático (showcaseData) se muestra si la API no devuelve casos.
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { SuccessCases } from '@/components/sections/SuccessCases';
import type { ShowcaseConfig } from '@/lib/config-constants';

// ─── Mocks de Dependencias Externas ───────────────────────────────────────────

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

vi.mock('@/lib/utils/haptics', () => ({
  Haptics: {
    impact: vi.fn(),
    slide: vi.fn(),
  },
}));

vi.mock('framer-motion', () => ({
  LazyMotion: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  domAnimation: {},
  m: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/CountUp', () => ({
  __esModule: true,
  default: ({ to, className }: { to: number; className?: string }) => (
    <span className={className}>{to}</span>
  ),
}));

// Next.js Image — simplificado para jsdom
vi.mock('next/image', () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />
  ),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SHOWCASE_FALLBACK: ShowcaseConfig = {
  beforeImageUrl: '/casos-exito/caso-01-antes.webp',
  afterImageUrl: '/casos-exito/caso-01-despues.webp',
  counterValue: '1800+',
  counterLabel: 'Casos Gestionados',
};

const API_CASES_RESPONSE = {
  cases: [
    {
      id: 'caso-001',
      title: 'Caso Bogotá 2024',
      beforeImageUrl: 'https://blob.vercel-storage.com/antes-001.webp',
      afterImageUrl: 'https://blob.vercel-storage.com/despues-001.webp',
      createdAt: '2024-01-15T10:00:00.000Z',
    },
    {
      id: 'caso-002',
      title: 'Caso Medellín 2024',
      beforeImageUrl: 'https://blob.vercel-storage.com/antes-002.webp',
      afterImageUrl: 'https://blob.vercel-storage.com/despues-002.webp',
      createdAt: '2024-01-10T10:00:00.000Z',
    },
  ],
};

// ─── Mock de IntersectionObserver ─────────────────────────────────────────────

/**
 * jsdom no implementa IntersectionObserver. Lo reemplazamos con una clase real
 * porque Vitest requiere que `new IntersectionObserver()` sea un constructor válido.
 * Exponemos el callback y la instancia para que los tests puedan dispararlo manualmente.
 */
let observerCallback: ((entries: Partial<IntersectionObserverEntry>[]) => void) | null = null;
let observerInstance: { observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> } | null = null;

class MockIntersectionObserver {
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;

  constructor(callback: (entries: Partial<IntersectionObserverEntry>[]) => void) {
    observerCallback = callback;
    this.observe = vi.fn();
    this.disconnect = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    observerInstance = this;
  }
}

function setupIntersectionObserverMock() {
  observerCallback = null;
  observerInstance = null;
  global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
}

// ─── Suite de Tests ────────────────────────────────────────────────────────────

describe('SuccessCases — Skeleton Loader + Intersection Observer Lazy Fetch', () => {
  beforeEach(() => {
    setupIntersectionObserverMock();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('debe mostrar el skeleton mientras isLoading es true (antes de que el Observer dispare)', () => {
    render(<SuccessCases showcaseData={SHOWCASE_FALLBACK} />);

    // El skeleton tiene aria-busy="true" como indicador de accesibilidad
    const skeleton = screen.getByRole('region', { name: /casos de éxito/i })
      .querySelector('[aria-busy="true"]');
    expect(skeleton).toBeTruthy();
  });

  it('NO debe llamar a fetch antes de que el Observer reporté intersección', () => {
    render(<SuccessCases showcaseData={SHOWCASE_FALLBACK} />);

    // El Observer se creó pero aún no disparó
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('debe llamar a fetch UNA SOLA VEZ cuando isIntersecting = true', async () => {
    (global.fetch as Mock).mockResolvedValueOnce({
      json: async () => API_CASES_RESPONSE,
    });

    render(<SuccessCases showcaseData={SHOWCASE_FALLBACK} />);

    // Simulamos que la sección entra en el viewport
    await act(async () => {
      observerCallback?.([{ isIntersecting: true }]);
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith('/api/gallery');
  });

  it('debe desconectar el Observer inmediatamente después de disparar el fetch', async () => {
    (global.fetch as Mock).mockResolvedValueOnce({
      json: async () => API_CASES_RESPONSE,
    });

    render(<SuccessCases showcaseData={SHOWCASE_FALLBACK} />);

    await act(async () => {
      observerCallback?.([{ isIntersecting: true }]);
    });

    // El Observer debe estar desconectado para evitar re-disparos
    expect(observerInstance?.disconnect).toHaveBeenCalled();
  });

  it('NO debe hacer un segundo fetch si el Observer dispara múltiples veces', async () => {
    (global.fetch as Mock).mockResolvedValue({
      json: async () => API_CASES_RESPONSE,
    });

    render(<SuccessCases showcaseData={SHOWCASE_FALLBACK} />);

    await act(async () => {
      observerCallback?.([{ isIntersecting: true }]);
      observerCallback?.([{ isIntersecting: false }]);
      observerCallback?.([{ isIntersecting: true }]); // segundo disparo — debe ignorarse
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('debe mostrar los botones de miniatura cuando la API devuelve múltiples casos', async () => {
    (global.fetch as Mock).mockResolvedValueOnce({
      json: async () => API_CASES_RESPONSE,
    });

    render(<SuccessCases showcaseData={SHOWCASE_FALLBACK} />);

    await act(async () => {
      observerCallback?.([{ isIntersecting: true }]);
    });

    await waitFor(() => {
      expect(screen.getByText('Caso Bogotá 2024')).toBeTruthy();
      expect(screen.getByText('Caso 1 de 2')).toBeTruthy();
    });
  });

  it('debe mostrar el slider con el fallback (showcaseData) cuando la API devuelve array vacío', async () => {
    (global.fetch as Mock).mockResolvedValueOnce({
      json: async () => ({ cases: [] }),
    });

    render(<SuccessCases showcaseData={SHOWCASE_FALLBACK} />);

    await act(async () => {
      observerCallback?.([{ isIntersecting: true }]);
    });

    // Sin datos dinámicos, se usa showcaseData — no debe mostrar el skeleton ni el "no hay casos"
    await waitFor(() => {
      // El slider estático debería estar visible con las imágenes fallback
      const imgs = screen.getAllByRole('img');
      const hasFallbackBefore = imgs.some((img) =>
        img.getAttribute('src')?.includes('caso-01-antes')
      );
      expect(hasFallbackBefore).toBe(true);
    });
  });

  it('debe mostrar el contador de casos desde showcaseData', () => {
    render(<SuccessCases showcaseData={SHOWCASE_FALLBACK} />);

    expect(screen.getByText((content, node) => node?.textContent === '1800+')).toBeTruthy();
    expect(screen.getByText('Casos Gestionados')).toBeTruthy();
  });
});
