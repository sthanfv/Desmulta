import { NextRequest, NextResponse } from 'next/server';
import { revokeVipSession, getVipSecret } from '@/lib/security/vip-jwt';
import { jwtVerify } from 'jose';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('_vip_session')?.value;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, getVipSecret());
      if (payload.jti) {
        await revokeVipSession(payload.jti as string);
      }
    } catch {
      // Ignorar si el token ya expiró o es inválido
    }
  }

  const redirectUrl = new URL('/vip', request.url);
  const response = NextResponse.redirect(redirectUrl);

  response.cookies.delete('_vip_session');

  return response;
}
