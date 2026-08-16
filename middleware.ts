import { NextRequest, NextResponse } from 'next/server';
import { APP_BASE_PATH } from '@/lib/app-config';
import { KRIYO_SESSION_COOKIE } from '@/lib/session';

const protectedPaths = ['/dashboard', '/accounts', '/engine', '/tracking'];

function stripBasePath(pathname: string) {
  if (!pathname.startsWith(APP_BASE_PATH)) {
    return pathname;
  }

  const stripped = pathname.slice(APP_BASE_PATH.length);
  return stripped.length > 0 ? stripped : '/';
}

function isPublicAsset(pathname: string) {
  return pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('.') || pathname === '/favicon.ico';
}

function hasSessionCookie(request: NextRequest) {
  return request.cookies.has(KRIYO_SESSION_COOKIE);
}

export function middleware(request: NextRequest) {
  const pathname = stripBasePath(request.nextUrl.pathname);
  const hasSession = hasSessionCookie(request);

  if (pathname === '/') {
    return NextResponse.redirect(new URL(hasSession ? `${APP_BASE_PATH}/dashboard` : `${APP_BASE_PATH}/sas`, request.url));
  }

  if (isPublicAsset(pathname) || pathname === '/login' || pathname === '/signup' || pathname === '/sas') {
    return NextResponse.next();
  }

  if (protectedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    if (!hasSession) {
      return NextResponse.redirect(new URL(`${APP_BASE_PATH}/sas`, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/accounts/:path*', '/engine/:path*', '/tracking/:path*', '/sas', '/login', '/signup']
};
