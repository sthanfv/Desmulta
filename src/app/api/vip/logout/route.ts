import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const redirectUrl = new URL('/vip', request.url);
  const response = NextResponse.redirect(redirectUrl);

  response.cookies.delete('_vip_session');

  return response;
}
