import { render, screen, act, fireEvent } from '@testing-library/react';
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

vi.mock('@sentry/nextjs', () => {
  const captureMessage = vi.fn();
  const withScope = vi.fn().mockImplementation((callback) => {
    const scope = {
      setLevel: vi.fn(),
      setTag: vi.fn(),
      setExtra: vi.fn(),
    };
    callback(scope);
  });
  return {
    withScope,
    captureMessage,
  };
});

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
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 800,
    });

    await act(async () => {
      render(<TouchDebugger />);
    });

    // Activar usando fireEvent en document
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        fireEvent.touchStart(document, {
          touches: [{ clientX: 50, clientY: 750 }],
        });
        vi.advanceTimersByTime(100);
      });
    }

    expect(screen.getByText(/TouchDebugger v/i)).toBeInTheDocument();
    expect(screen.getByText('STOR')).toBeInTheDocument();
  });

  it('debe registrar y mostrar la duración de un toque prolongado (>500ms)', async () => {
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 800,
    });

    await act(async () => {
      render(<TouchDebugger />);
    });

    // Activar el debugger
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        fireEvent.touchStart(document, {
          touches: [{ clientX: 50, clientY: 750 }],
        });
        vi.advanceTimersByTime(100);
      });
    }

    // Cambiar al tab TOUCH
    const tabTouch = screen.getByRole('button', { name: 'TOUCH' });
    await act(async () => {
      tabTouch.click();
    });

    // Crear un botón de prueba en el DOM
    const testButton = document.createElement('button');
    testButton.id = 'boton-duracion-test';
    document.body.appendChild(testButton);

    // Espiar Date.now() de forma determinista y controlable
    let mockTime = 1000;
    const nowMock = vi.spyOn(Date, 'now').mockImplementation(() => mockTime);

    // Simular touchstart en el botón usando fireEvent
    mockTime = 1000;
    await act(async () => {
      fireEvent.touchStart(testButton, {
        touches: [{ clientX: 200, clientY: 200 }],
      });
    });

    // Avanzar el tiempo simulado a 600ms después
    mockTime = 1600;

    // Simular touchend en el botón usando fireEvent
    await act(async () => {
      fireEvent.touchEnd(testButton);
    });

    // Validar que se registre en pantalla la duración del toque con el texto "600ms"
    expect(screen.getByText('600ms')).toBeInTheDocument();
    expect(screen.getByText('<button>')).toBeInTheDocument();

    nowMock.mockRestore();
    document.body.removeChild(testButton);
  });

  it('debe detectar un RAGE_CLICK al hacer 5 toques rápidos en el mismo elemento y notificar a Sentry', async () => {
    const sentryMock = await import('@sentry/nextjs');

    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 800,
    });

    await act(async () => {
      render(<TouchDebugger />);
    });

    // Activar debugger
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        fireEvent.touchStart(document, {
          touches: [{ clientX: 50, clientY: 750 }],
        });
        vi.advanceTimersByTime(100);
      });
    }

    // Cambiar al tab TOUCH
    const tabTouch = screen.getByRole('button', { name: 'TOUCH' });
    await act(async () => {
      tabTouch.click();
    });

    const testButton = document.createElement('button');
    testButton.id = 'boton-rage-test';
    document.body.appendChild(testButton);

    // Simular 5 toques rápidos en el mismo botón en menos de 2 segundos usando fireEvent
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        fireEvent.touchStart(testButton, {
          touches: [{ clientX: 250, clientY: 250 }],
        });
        fireEvent.touchEnd(testButton);
        vi.advanceTimersByTime(100);
      });
    }

    // Validar indicador visual de RAGE_CLICK en el tab y banner
    expect(screen.getByLabelText('RAGE_CLICK detectado')).toBeInTheDocument();
    expect(screen.getByText(/RAGE_CLICK · boton-rage-test/i)).toBeInTheDocument();

    // Validar que se reportara a Sentry
    expect(sentryMock.captureMessage).toHaveBeenCalledWith('[TouchDebugger] RAGE_CLICK detectado');

    document.body.removeChild(testButton);
  });

  it('debe vaciar todos los logs táctiles y restablecer el RAGE_CLICK al limpiar', async () => {
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 800,
    });

    await act(async () => {
      render(<TouchDebugger />);
    });

    // Activar debugger
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        fireEvent.touchStart(document, {
          touches: [{ clientX: 50, clientY: 750 }],
        });
        vi.advanceTimersByTime(100);
      });
    }

    // Cambiar al tab TOUCH
    const tabTouch = screen.getByRole('button', { name: 'TOUCH' });
    await act(async () => {
      tabTouch.click();
    });

    // Añadir un toque
    const testButton = document.createElement('button');
    testButton.id = 'boton-limpiar-test';
    document.body.appendChild(testButton);

    await act(async () => {
      fireEvent.touchStart(testButton, {
        touches: [{ clientX: 200, clientY: 200 }],
      });
    });

    expect(screen.getByText('<button>')).toBeInTheDocument();

    // Buscar y presionar el botón de limpiar logs (etiquetado como Clear inicialmente)
    const btnClear = screen.getByText('Clear');

    // El botón de limpiar requiere confirmación (cambia a Seguro?)
    await act(async () => {
      fireEvent.click(btnClear);
    });

    // Buscar el botón de confirmación "Seguro?" (según TouchDebugger.tsx, es 'Seguro?' sin '¿')
    const btnConfirm = screen.getByText('Seguro?');
    await act(async () => {
      fireEvent.click(btnConfirm);
    });

    // Validar de forma síncrona que se haya limpiado el log
    expect(screen.getByText(/Sin registros/i)).toBeInTheDocument();
    expect(screen.queryByText('<button>')).not.toBeInTheDocument();

    document.body.removeChild(testButton);
  });
});
