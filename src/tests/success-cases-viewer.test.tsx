import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }));

import { SuccessCases } from '@/components/sections/SuccessCases';

const CASES = [1, 2, 3].map((n) => ({
  id: `caso-${n}`,
  title: `Caso real ${n}`,
  beforeImageUrl: `https://x.public.blob.vercel-storage.com/antes-${n}.webp`,
  afterImageUrl: `https://x.public.blob.vercel-storage.com/despues-${n}.webp`,
  createdAt: '2026-09-01T00:00:00.000Z',
}));

const showcaseData = {
  beforeImageUrl: '/casos-exito/caso-01-antes.webp',
  afterImageUrl: '/casos-exito/caso-01-despues.webp',
  counterValue: '1800+',
  counterLabel: 'Casos',
};

// jsdom no trae IntersectionObserver: se simula que la sección entra en pantalla al observarla
class InstantIntersectionObserver {
  constructor(private readonly cb: IntersectionObserverCallback) {}
  observe() {
    this.cb([{ isIntersecting: true } as IntersectionObserverEntry], this as never);
  }
  disconnect() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
}

async function renderGallery() {
  render(<SuccessCases showcaseData={showcaseData} />);
  await screen.findByText('Caso 1 de 3');
}

function touch(el: Element, type: 'start' | 'move' | 'end', x: number, y = 100) {
  const point = [{ clientX: x, clientY: y }];
  if (type === 'start') fireEvent.touchStart(el, { touches: point });
  if (type === 'move') fireEvent.touchMove(el, { touches: point });
  if (type === 'end') fireEvent.touchEnd(el, { changedTouches: point });
}

function swipeArea() {
  // El contenedor que escucha el gesto es el que envuelve la flecha "Caso anterior"
  return screen.getAllByRole('button', { name: 'Caso anterior' })[0].parentElement as HTMLElement;
}

describe('Visor de casos de éxito', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', InstantIntersectionObserver);
    global.fetch = vi.fn().mockResolvedValue({ json: async () => ({ cases: CASES }) }) as never;
    window.history.replaceState(null, '');
    document.body.style.overflow = '';
  });

  it('deslizar a la izquierda pasa al caso siguiente', async () => {
    await renderGallery();
    const area = swipeArea();

    touch(area, 'start', 300);
    touch(area, 'move', 200);
    touch(area, 'end', 200);

    expect(await screen.findByText('Caso 2 de 3')).toBeInTheDocument();
  });

  it('un gesto corto o vertical no cambia de caso', async () => {
    await renderGallery();
    const area = swipeArea();

    touch(area, 'start', 300, 100);
    touch(area, 'move', 280, 100); // 20 px: por debajo del umbral
    touch(area, 'end', 280, 100);
    touch(area, 'start', 300, 100);
    touch(area, 'move', 250, 400); // mayormente vertical: es scroll de la página
    touch(area, 'end', 250, 400);

    expect(screen.getByText('Caso 1 de 3')).toBeInTheDocument();
  });

  it('arrastrar la manija antes/después NO cambia de caso (antes sí saltaba)', async () => {
    await renderGallery();
    const handle = document.querySelector('[data-slider-handle]') as HTMLElement;

    touch(handle, 'start', 300);
    touch(handle, 'move', 100);
    touch(handle, 'end', 100);

    expect(screen.getByText('Caso 1 de 3')).toBeInTheDocument();
  });

  it('el visor bloquea el scroll del fondo y se cierra con "atrás" o con Escape', async () => {
    await renderGallery();

    fireEvent.click(
      screen.getAllByRole('button', { name: 'Ver en pantalla completa' })[0].parentElement!
    );
    expect(
      await screen.findByRole('dialog', { name: 'Visor de casos de éxito' })
    ).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
    expect(window.history.state?.visorCasos).toBe(true);

    // Gesto/botón "atrás" del teléfono
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.body.style.overflow).toBe('');

    // Escape
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Ver en pantalla completa' })[0].parentElement!
    );
    await screen.findByRole('dialog');
    window.history.replaceState(null, ''); // sin entrada propia: Escape cierra directo
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
