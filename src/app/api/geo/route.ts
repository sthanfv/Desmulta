import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: Request) {
  // Vercel inyecta 'x-vercel-ip-city' automáticamente en producción
  const city = request.headers.get('x-vercel-ip-city');

  if (city) {
    return NextResponse.json({ city: decodeURIComponent(city) });
  }

  return NextResponse.json({ city: null });
}
