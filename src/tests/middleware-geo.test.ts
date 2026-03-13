import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '../middleware';

describe('🌍 Edge Middleware - Hiper Localismo', () => {
  it('Debe transferir la ciudad codificada desde Vercel a nuestra cabecera personalizada', () => {
    // 1. Simulamos una petición donde Vercel detectó "Cúcuta" codificado
    const req = new NextRequest('http://localhost:9005/');
    req.headers.set('x-vercel-ip-city', 'C%C3%BAcuta');

    // 2. Pasamos la petición por nuestro middleware
    const res = middleware(req);

    // 3. Verificamos que el middleware haya asignado el valor sin corromperlo
    expect(res.headers.get('x-ciudad-usuario')).toBe('C%C3%BAcuta');
  });

  it('Debe usar "Colombia" como fallback si la petición no trae la cabecera de Vercel', () => {
    // 1. Petición en blanco (como cuando desarrollas en tu PC local)
    const req = new NextRequest('http://localhost:9005/');

    // 2. Ejecutamos el middleware
    const res = middleware(req);

    // 3. Verificamos la red de seguridad
    expect(res.headers.get('x-ciudad-usuario')).toBe('Colombia');
  });
});
