import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import LegalSkeleton from '@/components/ui/LegalSkeleton';

describe('Pruebas unitarias para LegalSkeleton', () => {
  afterEach(() => {
    cleanup();
  });

  it('debe renderizar la estructura del skeleton sin errores', () => {
    render(<LegalSkeleton />);

    // Verificamos que el contenedor principal esté presente
    const skeletonContainer = screen.getByTestId('legal-skeleton');
    expect(skeletonContainer).toBeInTheDocument();

    // Verificamos que tenga clases de animación (animate-pulse)
    expect(skeletonContainer).toHaveClass('animate-pulse');
  });
});
