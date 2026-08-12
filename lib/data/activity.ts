import { apiRequest } from "@/lib/auth-server";
import type { Receipt } from "@/lib/data/receipts";

/**
 * The public cashback feed behind the hero.
 *
 * Fetched on the server with a revalidate window rather than polled from the
 * browser. A landing page gets a lot of visitors and this data changes when a
 * claim is approved - minutes to hours - so an open connection or a per-visitor
 * poll would be a lot of traffic for content that rarely moves. Rendering it
 * into the cached HTML also means the deck is populated on first paint instead
 * of appearing a moment later.
 *
 * (A webhook is not an option here even in principle: webhooks are server to
 * server, and nothing can push to a browser that has not asked.)
 */

/** A minute for visitors; five seconds while developing, so an approved claim
 *  shows up on the home deck while you are still looking at it. */
const REVALIDATE_SECONDS = process.env.NODE_ENV === "development" ? 5 : 60;

/**
 * A build must never hang on a service being slow.
 *
 * These run during prerender, so a stalled API would stall the build itself
 * rather than degrade one page. The deadline turns that into the fallback path
 * the callers already handle.
 */
const FETCH_TIMEOUT_MS = 8_000;


export interface ActivityEntry {
  ref: string;
  firm: string;
  plan: string;
  coupon: string | null;
  grossUsd: string | null;
  currency: string;
  cashbackUsd: string | null;
  who: string;
  at: string;
  status: "paid" | "pending";
}

export async function fetchRecentActivity(take = 10): Promise<ActivityEntry[]> {
  try {
    const response = await apiRequest(`/activity/recent?take=${take}`, {
      cache: "force-cache",
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    } as RequestInit);

    if (!response.ok) return [];
    return (await response.json()) as ActivityEntry[];
  } catch {
    // The marketing page must render whether or not the API is reachable.
    return [];
  }
}

/**
 * Maps the feed onto the shape the receipt card draws.
 *
 * The card was designed around a list price and two percentages; the API
 * reports what was actually paid and what the buyer actually got back. Rather
 * than re-derive a "discount" nobody recorded, the discount is zeroed and the
 * cashback percentage is computed from the two real figures - so the printed
 * numbers are the real ones and only the rate is inferred.
 */
export function toReceipts(entries: ActivityEntry[]): Receipt[] {
  return entries
    .filter((entry) => entry.cashbackUsd && entry.grossUsd)
    .map((entry) => {
      const list = Number(entry.grossUsd);
      const cashback = Number(entry.cashbackUsd);
      const cashbackPct = list > 0 ? Number(((cashback / list) * 100).toFixed(1)) : 0;

      return {
        firm: entry.firm,
        plan: entry.plan,
        coupon: entry.coupon ?? "JAISARA",
        list,
        discountPct: 0,
        cashbackPct,
        who: entry.who,
        ago: relativeAgo(entry.at),
        // The figure that was actually credited, so the card never prints a
        // rounded re-derivation of it.
        cashbackUsd: cashback,
        // Never the firm's order number - that is the key a claim is made
        // against, and publishing one would let anyone claim that purchase.
        id: entry.ref,
        status: entry.status,
      } satisfies Receipt;
    });
}

/** "JUST NOW" / "4 MIN AGO" - the deck prints these upper-case. */
function relativeAgo(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "JUST NOW";
  if (minutes < 60) return `${minutes} MIN AGO`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} HR AGO`;

  return `${Math.floor(hours / 24)} D AGO`;
}

/** One-line strings for the marquee, from the same feed. */
export function toMarquee(entries: ActivityEntry[]): string[] {
  return entries
    .filter((entry) => entry.cashbackUsd)
    .map((entry) => {
      const initials = entry.who
        .split(/[\s.]+/)
        .filter(Boolean)
        .map((part) => part[0])
        .join("");
      return `${initials} just got $${entry.cashbackUsd} back from ${entry.firm}`;
    });
}
