import { render, screen, act, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import SecureProcessingSequence from '@/components/ui/SecureProcessingSequence';

describe('Pruebas unitarias para SecureProcessingSequence', () => {
  const mockSteps = [
    'Inicializando motor Zero-PII...',
    'Saneando metadatos...',
    'Criptografía activada.',
  ];

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('debe renderizar la cabecera con el título por defecto', () => {
    render(<SecureProcessingSequence sequenceSteps={mockSteps} />);
    expect(screen.getByText('Procesamiento de Seguridad')).toBeInTheDocument();
  });

  it('debe mostrar progresivamente los pasos de la secuencia', () => {
    render(<SecureProcessingSequence sequenceSteps={mockSteps} />);

    // Avanzar el temporizador para el primer paso (800ms)
    act(() => {
      vi.advanceTimersByTime(900);
    });

    expect(screen.getByText('Inicializando motor Zero-PII...')).toBeInTheDocument();

    // Avanzar para el segundo paso
    act(() => {
      vi.advanceTimersByTime(900);
    });

    expect(screen.getByText('Saneando metadatos...')).toBeInTheDocument();
  });

  it('debe marcar como completado al finalizar todos los pasos', () => {
    const onComplete = vi.fn();
    render(<SecureProcessingSequence sequenceSteps={mockSteps} onComplete={onComplete} />);

    act(() => {
      vi.advanceTimersByTime(4000); // 800ms * 4 + margen
    });

    expect(onComplete).toHaveBeenCalled();
  });
});
