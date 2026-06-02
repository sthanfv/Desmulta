import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PushPermissionBanner } from '../../../src/components/vial-clear/PushPermissionBanner';
import '@testing-library/jest-dom';

describe('PushPermissionBanner', () => {
  it('renders correctly', () => {
    const mockOnActivar = vi.fn();
    const mockOnCerrar = vi.fn();

    render(
      <PushPermissionBanner
        docId="test-doc"
        isHandlingPermission={false}
        onActivar={mockOnActivar}
        onCerrar={mockOnCerrar}
      />
    );

    expect(screen.getByText('¿Recibir una alerta nativa cuando tu caso tenga novedades?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /activar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cerrar banner/i })).toBeInTheDocument();
  });

  it('calls onActivar when Activar button is clicked', () => {
    const mockOnActivar = vi.fn();
    const mockOnCerrar = vi.fn();

    render(
      <PushPermissionBanner
        docId="test-doc"
        isHandlingPermission={false}
        onActivar={mockOnActivar}
        onCerrar={mockOnCerrar}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /activar/i }));
    expect(mockOnActivar).toHaveBeenCalledWith('test-doc');
  });

  it('calls onCerrar when close button is clicked', () => {
    const mockOnActivar = vi.fn();
    const mockOnCerrar = vi.fn();

    render(
      <PushPermissionBanner
        docId="test-doc"
        isHandlingPermission={false}
        onActivar={mockOnActivar}
        onCerrar={mockOnCerrar}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /cerrar banner/i }));
    expect(mockOnCerrar).toHaveBeenCalled();
  });

  it('disables Activar button when isHandlingPermission is true', () => {
    const mockOnActivar = vi.fn();
    const mockOnCerrar = vi.fn();

    render(
      <PushPermissionBanner
        docId="test-doc"
        isHandlingPermission={true}
        onActivar={mockOnActivar}
        onCerrar={mockOnCerrar}
      />
    );

    const btn = screen.getByRole('button', { name: '...' });
    expect(btn).toBeDisabled();
  });
});
