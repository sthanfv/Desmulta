import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TouchDebugger } from '@/components/dev/TouchDebugger';

// Mock de framer-motion para evitar errores de compilación de animaciones en testing
vi.mock('framer-motion', () => ({
  m: {
    div: ({
      children,
      className,
      ...props
    }: {
      children?: import('react').ReactNode;
      className?: string;
      [key: string]: unknown;
    }) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: { children?: import('react').ReactNode }) => <>{children}</>,
}));

vi.mock('@sentry/nextjs', () => ({
  withScope: vi.fn(),
  captureMessage: vi.fn(),
}));

describe('🖥️ Componente: TouchDebugger (v10.0 Developer Edition)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debe iniciar inactivo y retornar null para no interferir con el renderizado inicial', () => {
    const { container } = render(<TouchDebugger />);
    expect(container.firstChild).toBeNull();
  });

  it('debe activarse con 5 toques en la esquina y mostrar nuevas características (Storage, Nuclear)', async () => {
    // Definir la altura de la ventana
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 800,
    });

    await act(async () => {
      render(<TouchDebugger />);
    });

    // Disparar 5 toques en la esquina inferior izquierda (x < 100, y > 700)
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        const touchEvent = new TouchEvent('touchstart', {
          touches: [{ clientX: 50, clientY: 750 } as unknown as Touch],
        });
        document.dispatchEvent(touchEvent);
        vi.advanceTimersByTime(100);
      });
    }

    // Debe existir la cabecera
    expect(screen.getByText(/TouchDebugger v/i)).toBeInTheDocument();

    // Deben existir los nuevos features (Tab STORAGE, Botón NUCLEAR)
    expect(screen.getByText('STOR')).toBeInTheDocument();
  });
});
