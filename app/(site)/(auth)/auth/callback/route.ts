import { NextResponse, type NextRequest } from "next/server";
import { apiRequest, setAuthCookies, upstreamHeaders } from "@/lib/auth-server";
import type { TokenPair } from "@/lib/auth-types";

/**
 * Where Google sends the member back, handled entirely on the server.
 *
 * This used to be a page: the API redirected with the access **and refresh**
 * tokens in the URL fragment, a client component read `window.location.hash`,
 * and posted them to a route that set the cookies. Every step of that was
 * visible to page scripts, and the refresh token is the long-lived credential
 * the httpOnly-cookie design exists to keep away from them - so one XSS on this
 * page was a permanent account takeover rather than a fifteen-minute one.
 *
 * Now the API redirects with a single-use code, and this exchanges it from the
 * server. No token is ever in the URL, in React state, or reachable by any
 * script. The browser's part is a redirect it cannot read the result of.
 *
 * A route handler rather than a page because there is nothing to render: on
 * success it is a redirect, and on failure it hands off to the sign-in screen
 * with a reason. The previous version's "Finishing your Google sign-in…"
 * spinner existed only to cover the round trip it was making from the browser.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  const failure = (reason: string) => {
    const target = new URL("/login", request.nextUrl.origin);
    target.searchParams.set("error", reason);
    return NextResponse.redirect(target);
  };

  if (!code) return failure("google_incomplete");

  let upstream: Response;
  try {
    upstream = await apiRequest("/auth/oauth/exchange", {
      method: "POST",
      headers: new Headers({
        ...Object.fromEntries(upstreamHeaders(request, false)),
        "content-type": "application/json",
      }),
      body: JSON.stringify({ code }),
    });
  } catch {
    return failure("service_unavailable");
  }

  if (!upstream.ok) return failure("google_failed");

  const body = (await upstream.json().catch(() => null)) as Partial<TokenPair> | null;

  if (
    !body ||
    typeof body.accessToken !== "string" ||
    typeof body.refreshToken !== "string" ||
    typeof body.expiresIn !== "string" ||
    typeof body.refreshExpiresIn !== "string"
  ) {
    return failure("google_incomplete");
  }

  // Straight to the dashboard. The session is already established by the time
  // the browser is told where to go, so there is no window in which a signed-in
  // member sees a signed-out page.
  const response = NextResponse.redirect(new URL("/dashboard", request.nextUrl.origin));
  setAuthCookies(response, body as TokenPair);
  return response;
}
