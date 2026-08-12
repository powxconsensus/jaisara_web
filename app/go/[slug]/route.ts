import { NextResponse, type NextRequest } from "next/server";
import { authApiUrl, authenticatedRequest } from "@/lib/auth-server";

/**
 * The outbound click to a firm.
 *
 * This exists so the click is attributed to the member who made it. The API's
 * `/go/:slug` records the click and builds the firm's URL with the member's
 * sub-id attached - but it authenticates by bearer token, and a browser
 * navigating straight to the API sends only cookies. Routing through here
 * attaches the token, so a signed-in member's click is logged as theirs
 * instead of as an anonymous one.
 *
 * That matters more than it looks. The tracked click is the corroboration for
 * a later claim: when the firm's report is thin, "this member clicked through
 * to this firm forty minutes before this order" is what turns a manual review
 * into an approval.
 *
 * `redirect: "manual"` is the load-bearing detail - without it `fetch` follows
 * the 302 itself, and the member would get the firm's HTML served from our own
 * domain rather than being sent to the firm.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await context.params;
  const coupon = request.nextUrl.searchParams.get("coupon");
  const query = coupon ? `?coupon=${encodeURIComponent(coupon)}` : "";
  const path = `/go/${encodeURIComponent(slug)}${query}`;

  try {
    const { upstream } = await authenticatedRequest(request, path, { redirect: "manual" });
    const target = upstream.headers.get("location");

    if (target && /^https?:\/\//i.test(target)) {
      return NextResponse.redirect(target, {
        // The sub-id is per member; a shared cache would attribute one
        // member's purchases to another.
        headers: { "cache-control": "no-store, private" },
      });
    }
  } catch {
    // Fall through - a member who wanted to buy should still reach the firm.
  }

  /**
   * Anonymous fallback.
   *
   * A signed-out visitor has no token to attach, and an outage here must not
   * dead-end somebody trying to spend money. The API handles the same route
   * unauthenticated: the click is still recorded, just without a member on it.
   */
  return NextResponse.redirect(authApiUrl(path).toString(), {
    headers: { "cache-control": "no-store, private" },
  });
}
