import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SemaforoCiudadano } from '@/components/vial-clear/SemaforoCiudadano';
import type { LegalStatus } from '@/lib/definitions';

// Mock de Framer Motion para simplificar los tests de renderizado
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

describe('SemaforoCiudadano Component (Premium v8.10.1)', () => {
  it('debe renderizar el estado PRESCRITO con el diseño correcto', () => {
    render(<SemaforoCiudadano status="PRESCRITO" />);

    expect(screen.getByText(/VIABILIDAD ALTA/i)).toBeInTheDocument();
    expect(screen.getByText(/LEY 769 \(PRESCRIPCIÓN\)/i)).toBeInTheDocument();
  });

  it('debe renderizar el estado IMPUGNABLE_C038 con el diseño correcto', () => {
    render(<SemaforoCiudadano status="IMPUGNABLE_C038" />);

    expect(screen.getByText(/VIABILIDAD MEDIA/i)).toBeInTheDocument();
    expect(screen.getByText(/SENTENCIA C-038\/20/i)).toBeInTheDocument();
  });

  it('debe mostrar la alerta de baja confianza si lowConfidence es true', () => {
    render(<SemaforoCiudadano status="PRESCRITO" lowConfidence={true} />);

    expect(screen.getByText(/Lectura parcial/i)).toBeInTheDocument();
    expect(screen.getByText(/Revisión humana requerida/i)).toBeInTheDocument();
  });

  it('debe priorizar el dictum personalizado si se proporciona', () => {
    const customDictum = 'Caso extremadamente urgente por error en placa.';
    render(<SemaforoCiudadano status="VIGENTE" dictum={customDictum} />);

    expect(screen.getByText(new RegExp(customDictum, 'i'))).toBeInTheDocument();
  });

  it('debe renderizar el estado DESCONOCIDO por defecto', () => {
    render(<SemaforoCiudadano />);

    expect(screen.getByText(/CAPTURA PROCESADA DE FORMA SEGURA/i)).toBeInTheDocument();
  });

  it('debe aplicar clases de tema dinámicas basadas en el status', () => {
    const { container } = render(<SemaforoCiudadano status="CADUCADO" />);
    const div = container.firstChild as HTMLElement;

    // Verificamos que tenga clases relacionadas con emerald/verde para caducidad
    expect(div.className).toContain('emerald');
  });
});
