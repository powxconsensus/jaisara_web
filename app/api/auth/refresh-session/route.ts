import { NextResponse, type NextRequest } from "next/server";
import {
  clearAuthCookies,
  currentRefreshToken,
  rotate,
  setAuthCookies,
} from "@/lib/auth-server";

/**
 * Forces a token rotation using the refresh cookie.
 *
 * Needed because an access token can be *stale* without being *expired*. It
 * carries whether the email is verified, so the token minted at signup says
 * "unverified" and keeps saying so for its full fifteen minutes - right through
 * the moment the member clicks the verification link. The normal path only
 * rotates on expiry, so without this the member lands on a dashboard whose
 * verified-only calls are all refused for a quarter of an hour.
 *
 * Rotating re-reads the account, so the replacement says verified.
 *
 * No body, and nothing is returned but a flag: the tokens go straight into
 * httpOnly cookies and must never be readable from script.
 */
export async function POST(request: NextRequest) {
  const refreshToken = await currentRefreshToken();
  if (!refreshToken) {
    return NextResponse.json({ message: "No session to refresh" }, { status: 401 });
  }

  try {
    /**
     * Through the shared helper, not a second implementation.
     *
     * This called `/auth/refresh` directly and so sat outside the single-flight
     * map every other route rotates through. Two rotations for one cookie could
     * therefore run at once from the same process - the API declines the second
     * without revoking the family, but the decline arrives here as a 401 and
     * the handler below clears the cookies, signing out a member whose session
     * had just been successfully renewed by the other request.
     *
     * `rotate` returns the winner's tokens to both callers instead.
     */
    const tokens = await rotate(refreshToken, request);

    /**
     * A race is not a dead session, and must not clear the cookies.
     *
     * The other request rotated first and set the new pair on its own response,
     * so the cookies here are either already current or about to be. Answering
     * 409 tells the client to retry rather than to sign in again - clearing
     * them would end a session the API deliberately kept alive.
     */
    if (tokens === "raced") {
      return NextResponse.json(
        { message: "Session was refreshed by another request - please retry." },
        { status: 409 },
      );
    }

    if (!tokens) {
      // The refresh token is spent or revoked; the cookies are dead weight and
      // leaving them would make every later request fail confusingly.
      const dead = NextResponse.json({ message: "Please sign in again" }, { status: 401 });
      clearAuthCookies(dead);
      return dead;
    }

    const response = NextResponse.json({ ok: true });
    setAuthCookies(response, tokens);
    return response;
  } catch {
    return NextResponse.json(
      { message: "The authentication service is unavailable. Please try again." },
      { status: 503 },
    );
  }
}
