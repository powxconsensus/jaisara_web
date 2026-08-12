import { NextResponse, type NextRequest } from "next/server";
import {
  applySessionResult,
  authenticatedRequest,
  readUpstreamBody,
  setAuthCookies,
} from "@/lib/auth-server";
import type { TokenPair } from "@/lib/auth-types";

/**
 * Changing a password ends every other session and renews this one.
 *
 * The API revokes all refresh tokens - that is what evicts anybody holding the
 * old password - and returns a freshly minted pair for the caller. Writing it
 * here is what keeps the current tab signed in; this route used to clear the
 * cookies instead, so the one person who had just proved they knew both
 * passwords was the one bounced to the login screen.
 *
 * The tokens never reach the browser as values: they go straight into httpOnly
 * cookies and the body is not forwarded.
 */
export async function POST(request: NextRequest) {
  try {
    const result = await authenticatedRequest(request, "/auth/change-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: await request.text(),
    });
    const body = await readUpstreamBody(result.upstream);

    if (result.upstream.ok) {
      const tokens = body as TokenPair | null;
      const response = NextResponse.json({ ok: true });

      // A successful change with no pair back would silently leave the old,
      // now-revoked cookies in place - every later request would 401. Better to
      // say the session ended and let the member sign in again.
      if (!tokens?.accessToken || !tokens.refreshToken) {
        return NextResponse.json(
          { message: "Your password was changed. Please sign in again." },
          { status: 205 },
        );
      }

      setAuthCookies(response, tokens);
      return response;
    }

    const response =
      body === null
        ? new NextResponse(null, { status: result.upstream.status })
        : NextResponse.json(body, { status: result.upstream.status });
    return applySessionResult(response, result);
  } catch {
    return NextResponse.json(
      { message: "The authentication service is unavailable. Please try again." },
      { status: 503 },
    );
  }
}
