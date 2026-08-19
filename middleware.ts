import { NextRequest, NextResponse } from "next/server";
import { APP_BASE_PATH } from "@/lib/app-config";
import { KRIYO_SESSION_COOKIE } from "@/lib/session";
import { refreshSupabaseSession } from "@/lib/supabase/middleware";

const protectedPaths = ["/dashboard", "/accounts", "/engine", "/tracking", "/education"];

function stripBasePath(pathname: string) {
  if (!pathname.startsWith(APP_BASE_PATH)) {
    return pathname;
  }

  const stripped = pathname.slice(APP_BASE_PATH.length);
  return stripped.length > 0 ? stripped : "/";
}

function isPublicAsset(pathname: string) {
  return pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.includes(".") || pathname === "/favicon.ico";
}

function hasSessionCookie(request: NextRequest) {
  return request.cookies.has(KRIYO_SESSION_COOKIE);
}

export async function middleware(request: NextRequest) {
  const pathname = stripBasePath(request.nextUrl.pathname);
  const hasSession = hasSessionCookie(request);
  let response = NextResponse.next();

  if (pathname === "/") {
    response = NextResponse.redirect(new URL(hasSession ? `${APP_BASE_PATH}/dashboard` : `${APP_BASE_PATH}/sas`, request.url));
    return refreshSupabaseSession(request, response);
  }

  if (isPublicAsset(pathname) || pathname === "/login" || pathname === "/signup" || pathname === "/sas") {
    return refreshSupabaseSession(request, response);
  }

  if (protectedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    if (!hasSession) {
      response = NextResponse.redirect(new URL(`${APP_BASE_PATH}/sas`, request.url));
      return refreshSupabaseSession(request, response);
    }
  }

  return refreshSupabaseSession(request, response);
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/accounts/:path*", "/engine/:path*", "/tracking/:path*", "/education/:path*", "/sas", "/login", "/signup"]
};
