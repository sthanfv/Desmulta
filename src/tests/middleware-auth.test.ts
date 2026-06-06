import { describe, it, expect, vi } from 'vitest';
import { middleware } from '@/middleware';

vi.mock('next-firebase-auth-edge/lib/next/tokens', () => ({
  getTokens: vi.fn().mockRejectedValue(new Error('Token inválido')),
}));

vi.mock('@/lib/security/vip-jwt', () => ({
  verifyVipSession: vi.fn().mockResolvedValue(null),
}));

const { mockRedirect, mockNext } = vi.hoisted(() => {
  return {
    mockRedirect: vi.fn((url) => ({
      status: 307,
      url: url.toString(),
      cookies: { delete: vi.fn() },
    })),
    mockNext: vi.fn(() => {
      const headers = new Map();
      return { headers };
    }),
  };
});

vi.mock('next/server', () => {
  return {
    NextResponse: {
      redirect: mockRedirect,
      next: mockNext,
    },
  };
});

describe('Middleware Security & Auth', () => {
  it('debe redirigir /admin a /acceso-panel si no hay token o es inválido', async () => {
    const req = {
      nextUrl: { pathname: '/admin/dashboard' },
      url: 'http://localhost/admin/dashboard',
      headers: new Map([['x-vercel-ip-city', 'Bogota']]),
      cookies: { get: vi.fn() },
    } as any;
    
    await middleware(req);
    expect(mockRedirect).toHaveBeenCalled();
  });

  it('debe aplicar cabeceras de seguridad estrictas para endpoints /api', async () => {
    const req = {
      nextUrl: { pathname: '/api/telemetry' },
      url: 'http://localhost/api/telemetry',
      headers: new Map([['x-vercel-ip-city', 'Medellin']]),
      cookies: { get: vi.fn() },
    } as any;
    
    const res = await middleware(req);
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('Permissions-Policy')).toContain('camera=()');
  });
});
