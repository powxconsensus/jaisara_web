/** Event emitted when the BFF has exhausted refresh and returns 401. */
export const SESSION_EXPIRED_EVENT = "jaisara:session-expired";

/**
 * Browser fetch for same-origin API calls.
 *
 * The BFF clears its httpOnly cookies when refresh fails, but React otherwise
 * has no way to learn that happened. Emitting one event here makes every
 * account surface clear together instead of leaving balances and roles from
 * the expired session painted in the navbar.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init);
  if (response.status === 401 && typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
  return response;
}
