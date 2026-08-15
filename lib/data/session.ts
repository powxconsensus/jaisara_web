import { cookies } from "next/headers";

import { ACCESS_TOKEN_COOKIE } from "@/lib/auth-cookies";
import { apiRequest } from "@/lib/auth-server";
import type { AuthUser } from "@/lib/auth-types";

/**
 * The signed-in member, resolved on the server.
 *
 * This exists to remove a waterfall, not to add a cache. The dashboard used to
 * render, hydrate, ask `/api/auth/me`, wait, and only then ask for anything
 * else - two strictly sequential browser round trips before a single number
 * appeared, because nothing could be requested until the session was known.
 * Against a remote API that is most of what the shimmer was showing, and no
 * amount of query tuning touches it: the second request cannot be issued until
 * the first returns.
 *
 * Resolved here, the page ships with the answer already in it.
 *
 * Deliberately *not* a security boundary. The API re-reads status and
 * permissions on every request regardless of what was rendered, so a suspended
 * account that somehow got a page still cannot use it.
 */

const TIMEOUT_MS = 4_000;

/**
 * Reads the access token from the request's cookies.
 *
 * A server component cannot set cookies, so an expired token is not refreshed
 * here - this returns null and the client's own `/api/auth/me` call takes over,
 * which *can* rotate. That path is the pre-existing behaviour, so the worst
 * case is exactly what happens today rather than a signed-out flash.
 */
export async function fetchSessionUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return null;

  try {
    const response = await apiRequest("/auth/me", {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) return null;
    return (await response.json()) as AuthUser;
  } catch {
    // A slow or unreachable API must not hold the page. Returning null falls
    // back to the client fetch, which is where this used to happen anyway.
    return null;
  }
}

/** The same call for any authenticated endpoint the server wants to pre-read. */
export async function fetchAuthed<T>(path: string): Promise<T | null> {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return null;

  try {
    const response = await apiRequest(path, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
