import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import RootLayout from '@/app/layout';

// Mock de la dependencia de Vercel para pruebas unitarias en Vitest
vi.mock('@vercel/analytics/react', () => ({
  Analytics: () => <div data-testid="vercel-analytics-mock" />,
}));

// Mock de next/font para no romper JSDOM
vi.mock('next/font/google', () => ({
  Inter: () => ({ className: 'mocked-inter', variable: '--font-inter' }),
  Instrument_Sans: () => ({ className: 'mocked-instrument', variable: '--font-instrument' }),
  Geist: () => ({ className: 'mocked-geist', variable: '--font-geist-sans' }),
}));

// Mock de headers de Next.js para evitar fallos en el renderizado del Layout
vi.mock('next/headers', () => ({
  headers: () => Promise.resolve(new Map()),
}));

// Mock de validación de entorno para evitar errores de variables faltantes
vi.mock('@/lib/env-check', () => ({
  validateEnv: vi.fn(),
}));

describe('Validación de Infraestructura Frontend', () => {
  it('debe inyectar el proveedor de Analytics en el árbol DOM', async () => {
    // @ts-ignore - RootLayout es un Server Component asíncrono
    const Layout = await RootLayout({ children: <div>Contenido de la aplicación</div> });

    const { getByTestId } = render(Layout);

    expect(getByTestId('vercel-analytics-mock')).toBeInTheDocument();
  });
});
