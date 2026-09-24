import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  activeTabFor,
  isAppShellRoute,
  openAssistant,
  openConsultation,
  OPEN_ASSISTANT_EVENT,
  OPEN_CONSULTATION_EVENT,
} from '@/components/mobile/app-shell';

const mockPathname = vi.fn(() => '/');
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }),
}));

import { MobileAppShell } from '@/components/mobile/MobileAppShell';
import { MobileQuickActions } from '@/components/mobile/MobileQuickActions';

describe('Modo app — rutas y pestañas', () => {
  it.each([
    '/',
    '/estado',
    '/calculadora',
    '/plantillas',
    '/blog/mi-post',
    '/multas/bogota/camaras',
  ])('muestra la carcasa en %s', (path) => {
    expect(isAppShellRoute(path)).toBe(true);
  });

  it.each([
    '/admin',
    '/admin/auditoria',
    '/acceso-panel',
    '/vip/dashboard',
    '/documentos/editor/x',
    '/api-docs',
  ])('NO muestra la carcasa en zonas privadas: %s', (path) => {
    expect(isAppShellRoute(path)).toBe(false);
  });

  it('no confunde prefijos parecidos (/administracion no es /admin)', () => {
    expect(isAppShellRoute('/administracion')).toBe(true);
  });

  it('resalta la pestaña según la ruta', () => {
    expect(activeTabFor('/')).toBe('inicio');
    expect(activeTabFor('/estado')).toBe('mi-caso');
    expect(activeTabFor('/seguir/abc123')).toBe('mi-caso');
    expect(activeTabFor('/blog')).toBeNull();
  });
});

describe('Modo app — acciones de Consultar y Asistente', () => {
  beforeEach(() => vi.clearAllMocks());

  it('en Inicio, Consultar abre el modal en el modo elegido (evento)', () => {
    const listener = vi.fn();
    window.addEventListener(OPEN_CONSULTATION_EVENT, listener);
    const navigate = vi.fn();

    openConsultation('simit', '/', navigate);

    expect(listener).toHaveBeenCalledTimes(1);
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({ mode: 'simit' });
    expect(navigate).not.toHaveBeenCalled();
    window.removeEventListener(OPEN_CONSULTATION_EVENT, listener);
  });

  it('en otra página, Consultar lleva a Inicio con el modo en la URL', () => {
    const navigate = vi.fn();
    openConsultation('full', '/blog', navigate);
    expect(navigate).toHaveBeenCalledWith('/?action=consultar&modo=full');
  });

  it('Asistente abre el chat en Inicio o navega con ?action=asistente', () => {
    const listener = vi.fn();
    window.addEventListener(OPEN_ASSISTANT_EVENT, listener);
    const navigate = vi.fn();

    openAssistant('/', navigate);
    openAssistant('/calculadora', navigate);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/?action=asistente');
    window.removeEventListener(OPEN_ASSISTANT_EVENT, listener);
  });
});

describe('MobileAppShell — renderizado', () => {
  beforeEach(() => vi.clearAllMocks());

  it('en Inicio muestra la barra superior y las 5 pestañas', () => {
    mockPathname.mockReturnValue('/');
    const { container } = render(<MobileAppShell />);

    expect(container.querySelector('[data-app-shell]')).not.toBeNull();
    for (const label of ['Inicio', 'Mi caso', 'Consultar', 'Asistente', 'Más']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText('Especialistas en multas de tránsito')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Inicio/ })).toHaveAttribute('aria-current', 'page');
  });

  it('en páginas internas no duplica la barra superior (conservan su barra con "atrás")', () => {
    mockPathname.mockReturnValue('/estado');
    render(<MobileAppShell />);

    expect(screen.queryByText('Especialistas en multas de tránsito')).toBeNull();
    expect(screen.getByRole('link', { name: /Mi caso/ })).toHaveAttribute('aria-current', 'page');
  });

  it('en el panel de administración no se renderiza', () => {
    mockPathname.mockReturnValue('/admin');
    const { container } = render(<MobileAppShell />);
    expect(container.innerHTML).toBe('');
  });
});

describe('MobileQuickActions — accesos rápidos del Inicio', () => {
  it('muestra las 4 acciones', () => {
    render(<MobileQuickActions />);
    for (const label of ['Consultar gratis', 'Subir foto', 'Calculadora', 'Asistente IA']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('Consultar gratis y Subir foto abren el formulario en su modo', () => {
    const listener = vi.fn();
    window.addEventListener(OPEN_CONSULTATION_EVENT, listener);
    render(<MobileQuickActions />);

    fireEvent.click(screen.getByText('Consultar gratis'));
    fireEvent.click(screen.getByText('Subir foto'));

    const modes = listener.mock.calls.map((c) => (c[0] as CustomEvent).detail.mode);
    expect(modes).toEqual(['full', 'simit']);
    window.removeEventListener(OPEN_CONSULTATION_EVENT, listener);
  });

  it('Asistente IA abre el chat y Calculadora baja hasta la calculadora', () => {
    const listener = vi.fn();
    window.addEventListener(OPEN_ASSISTANT_EVENT, listener);
    const target = document.createElement('div');
    target.id = 'calculadora-hero';
    target.scrollIntoView = vi.fn();
    document.body.appendChild(target);
    render(<MobileQuickActions />);

    fireEvent.click(screen.getByText('Asistente IA'));
    fireEvent.click(screen.getByText('Calculadora'));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(target.scrollIntoView).toHaveBeenCalled();
    window.removeEventListener(OPEN_ASSISTANT_EVENT, listener);
    target.remove();
  });
});
