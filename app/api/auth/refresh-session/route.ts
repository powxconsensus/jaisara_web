import { NextResponse, type NextRequest } from "next/server";
import {
  apiRequest,
  clearAuthCookies,
  currentRefreshToken,
  setAuthCookies,
  upstreamHeaders,
} from "@/lib/auth-server";
import type { TokenPair } from "@/lib/auth-types";

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
    const upstream = await apiRequest("/auth/refresh", {
      method: "POST",
      headers: new Headers({
        ...Object.fromEntries(upstreamHeaders(request, false)),
        "content-type": "application/json",
      }),
      body: JSON.stringify({ refreshToken }),
    });

    if (!upstream.ok) {
      // The refresh token is spent or revoked; the cookies are dead weight and
      // leaving them would make every later request fail confusingly.
      const dead = NextResponse.json({ message: "Please sign in again" }, { status: 401 });
      clearAuthCookies(dead);
      return dead;
    }

    const tokens = (await upstream.json()) as TokenPair;
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
