import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import TrackingClientUI from '@/app/seguir/[id]/TrackingClientUI';
import { TrackingCase } from '@/lib/definitions';

// Mock Framer Motion to prevent animation issues in jsdom
vi.mock('framer-motion', () => {
  const React = require('react');
  return {
    m: {
      div: React.forwardRef(({ children, whileHover, initial, animate, exit, transition, ...props }: any, ref: any) => (
        <div ref={ref} {...props}>{children}</div>
      ))
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>
  };
});

describe('TrackingClientUI Component', () => {
  const mockCase: TrackingCase = {
    shortId: 'TEST-123',
    status: 'contactado',
    nombre: 'John Doe',
    ciudad: 'Bogotá',
    createdAt: new Date('2023-01-01T10:00:00Z').toISOString(),
    eventos: [
      {
        fecha: new Date('2023-01-01T12:00:00Z').toISOString(),
        descripcion: 'Nuevo evento importante',
        tipo: 'status_change',
        estadoNuevo: 'estudio'
      }
    ]
  };

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('debe renderizar la bandeja de notificaciones si hay eventos nuevos no leídos', async () => {
    // Configuramos localStorage para simular que la última vez que el usuario vio fue ANTES del evento
    localStorage.setItem(`desmulta_last_seen_${mockCase.shortId}`, new Date('2023-01-01T11:00:00Z').toISOString());
    
    render(<TrackingClientUI caseData={mockCase} />);
    
    // Verificamos que el banner con el título 'Nueva Notificación' o actualizaciones aparece
    await waitFor(() => {
      expect(screen.getByText('Nueva Notificación')).toBeInTheDocument();
      expect(screen.getByText('Marcar como leída')).toBeInTheDocument();
    });
  });

  it('no debe renderizar la bandeja de notificaciones si los eventos ya fueron leídos', async () => {
    // Configuramos localStorage para simular que el usuario ya leyó el evento más reciente
    localStorage.setItem(`desmulta_last_seen_${mockCase.shortId}`, new Date('2023-01-01T13:00:00Z').toISOString());
    
    render(<TrackingClientUI caseData={mockCase} />);
    
    // El banner no debería aparecer
    await waitFor(() => {
      expect(screen.queryByText('Nueva Notificación')).not.toBeInTheDocument();
      expect(screen.queryByText('Marcar como leída')).not.toBeInTheDocument();
    });
  });

  it('debe ocultar el banner cuando se marca como leída', async () => {
    localStorage.setItem(`desmulta_last_seen_${mockCase.shortId}`, new Date('2023-01-01T11:00:00Z').toISOString());
    
    render(<TrackingClientUI caseData={mockCase} />);
    
    // El banner está presente inicialmente
    await waitFor(() => {
      expect(screen.getByText('Nueva Notificación')).toBeInTheDocument();
    });
    
    // Clic en 'Marcar como leída'
    const button = screen.getByText('Marcar como leída');
    fireEvent.click(button);
    
    // El banner debe desaparecer
    await waitFor(() => {
      expect(screen.queryByText('Nueva Notificación')).not.toBeInTheDocument();
    });
    
    // El localStorage debe haberse actualizado
    const storedDate = localStorage.getItem(`desmulta_last_seen_${mockCase.shortId}`);
    expect(storedDate).toBe(mockCase.eventos![0].fecha);
  });
});
