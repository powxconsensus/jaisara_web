import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth-cookies";

export function proxy(request: NextRequest) {
  const hasSession = Boolean(
    request.cookies.get(ACCESS_TOKEN_COOKIE)?.value ||
      request.cookies.get(REFRESH_TOKEN_COOKIE)?.value,
  );

  if (!hasSession) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

/**
 * `/console` is here as well as `/dashboard`.
 *
 * The console guards itself client-side too, but that check runs only after
 * the bundle has loaded — without this an unauthenticated visitor gets a blank
 * admin frame before being told to sign in. This is a redirect, not the
 * security boundary: every console request is authorised again by the API.
 */
export const config = {
  matcher: ["/dashboard/:path*", "/console", "/console/:path*"],
};
