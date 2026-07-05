import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '../middleware';

describe('🌍 Edge Middleware - Geobloqueo y Hiper Localismo', () => {
  it('Debe permitir el acceso si el país es Colombia (CO)', async () => {
    const req = new NextRequest('http://localhost:9005/');
    req.headers.set('x-vercel-ip-country', 'CO');
    const res = await middleware(req);
    // 200 OK
    expect(res.status).toBe(200);
  });

  it('Debe redirigir a /geo-bloqueado si el país no es Colombia', async () => {
    const req = new NextRequest('http://localhost:9005/');
    req.headers.set('x-vercel-ip-country', 'MX'); // Desde México
    const res = await middleware(req);
    // 302 Redirect
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('/geo-bloqueado');
  });

  it('Debe permitir el paso en desarrollo (sin cabecera de país)', async () => {
    const req = new NextRequest('http://localhost:9005/');
    // Sin x-vercel-ip-country
    const res = await middleware(req);
    // 200 OK
    expect(res.status).toBe(200);
  });

  it('Debe permitir acceso a rutas internas independientemente del país', async () => {
    const req = new NextRequest('http://localhost:9005/api/internal/test');
    req.headers.set('x-vercel-ip-country', 'US'); // IP gringa
    const res = await middleware(req);
    // Pasa directo sin redirección
    expect(res.status).toBe(200);
  });
});
