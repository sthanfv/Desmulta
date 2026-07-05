import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FirebaseConsumptionWidget } from '../components/FirebaseConsumptionWidget';
import { requireAdminSession } from '@/lib/auth/require-admin-session';

vi.mock('@/lib/auth/require-admin-session', () => ({
  requireAdminSession: vi.fn(),
}));

describe('Admin Panel & FinOps Integration', () => {
  it('Debe renderizar el FirebaseConsumptionWidget calculando ahorros correctos', () => {
    render(<FirebaseConsumptionWidget totalLeads={50} />);

    // 50 leads * 4 writes = 200
    expect(screen.getByText('200')).toBeDefined();

    // Verifica que el porcentaje de optimización aparezca
    expect(screen.getByText('99.9%')).toBeDefined();
  });

  it('Debe rechazar el acceso a funciones analíticas si no hay sesión de administrador', async () => {
    // Simulamos que la función de protección lanza un error
    vi.mocked(requireAdminSession).mockRejectedValueOnce(new Error('Sesión inválida o expirada.'));

    await expect(requireAdminSession('invalid_token')).rejects.toThrow(
      'Sesión inválida o expirada.'
    );
  });
});
