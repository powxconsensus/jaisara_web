import { apiRequest } from "@/lib/auth-server";
import type { Challenge, Firm, PayoutCadence } from "@/lib/data/firms";
import type { EstimatorFirm } from "@/lib/data/estimator";
import { CATEGORY_LABELS, type PlatformCategory } from "@/lib/platform-categories";

/**
 * The real firm catalogue.
 *
 * Maps `GET /deals` onto the `Firm` shape the storefront already renders, so
 * wiring the catalogue did not mean rewriting six screens. The static list in
 * `firms.ts` stays as the fallback for exactly one situation: a fresh install
 * where no firm has been published yet. A deals page that renders nothing
 * reads as broken rather than as new.
 *
 * Fetched on the server with a revalidate window - the catalogue changes when
 * an admin edits it, not per request, and every visitor should get cached HTML.
 */

/**
 * Five minutes in production; five seconds while developing.
 *
 * The long window is right for visitors - the catalogue changes when an admin
 * edits it, not per request. It is wrong for the person doing the editing: a
 * challenge published in the console stayed invisible on the storefront for
 * five minutes, which reads as "the save did not work" rather than "the page
 * is cached".
 */
const REVALIDATE_SECONDS = process.env.NODE_ENV === "development" ? 5 : 300;

/**
 * A build must never hang on a service being slow.
 *
 * These run during prerender, so a stalled API would stall the build itself
 * rather than degrade one page. The deadline turns that into the fallback path
 * the callers already handle.
 */
const FETCH_TIMEOUT_MS = 8_000;


interface DealProduct {
  slug: string;
  name: string;
  family: string | null;
  accountSize: number | null;
  kind: string;
  listPrice: string | null;
  currency: string;
  estCashbackPct: number | null;
  tradingPlatform: string | null;
  /** Set only when this challenge uses a code other than the firm's. */
  coupon?: { code: string; discountPct: string | null; status: string } | null;
}

export interface Deal {
  id: string;
  slug: string;
  supportsSubId?: boolean;
  name: string;
  logoUrl: string | null;
  description: string | null;
  websiteUrl?: string | null;
  profitSplit: string | null;
  payoutCadence: string | null;
  tradingPlatforms: string[];
  categories: PlatformCategory[];
  fulfillment: string;
  defaultCouponCode: string | null;
  products: DealProduct[];
  coupons: { code: string; discountPct: string | null }[];
}

export async function fetchDeals(): Promise<Deal[]> {
  try {
    const response = await apiRequest("/deals", {
      cache: "force-cache",
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    } as RequestInit);

    if (!response.ok) return [];
    return (await response.json()) as Deal[];
  } catch {
    return [];
  }
}

export async function fetchDeal(slug: string): Promise<Deal | null> {
  try {
    const response = await apiRequest(`/deals/${encodeURIComponent(slug)}`, {
      cache: "force-cache",
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    } as RequestInit);

    if (!response.ok) return null;
    return (await response.json()) as Deal;
  } catch {
    return null;
  }
}

/** Only published catalogue rows are public deals. */
export async function fetchFirms(): Promise<Firm[]> {
  const deals = await fetchDeals();
  return deals.map(toFirm);
}

/**
 * The firm's catalogue, cheapest first.
 *
 * Unpriced rows are dropped: a challenge with no list price cannot state what
 * it costs or what comes back, and a row reading "- / -" is worse than the row
 * not being there. They stay in the estimator's input data and in the console,
 * which is where a missing price should be noticed and fixed.
 */
function toChallenges(deal: Deal): Challenge[] {
  return deal.products
    .filter((product) => Number(product.listPrice) > 0)
    .map((product) => {
      const price = Number(product.listPrice);
      // This challenge's own code wins over the firm's. Most challenges carry
      // none and inherit, which is the common case; a firm running one code on
      // evaluations and another on instant funding is the reason the override
      // exists at all.
      //
      // Commission is paid on what the firm actually charged, so the discount
      // here decides the cashback too - see `challengeMath`, which this has to
      // agree with or the deals table and the estimator quote different figures
      // for the same challenge.
      const discountPct = couponFor(deal, product).discountPct;
      const paid = discountPct > 0 ? price * (1 - discountPct / 100) : price;
      const cashbackPct = product.estCashbackPct ?? 0;

      return {
        slug: product.slug,
        firmSlug: deal.slug,
        firmName: deal.name,
        firmMark: monogram(deal.name),
        firmLogoUrl: deal.logoUrl,
        name: product.name,
        plan: product.family?.trim() || null,
        size: product.accountSize ? `$${Math.round(product.accountSize / 1000)}K` : null,
        accountSize: product.accountSize,
        price,
        currency: product.currency,
        cashbackPct: Number(cashbackPct.toFixed(1)),
        // Rounded to the cent once, here, so no two screens can disagree.
        cashbackUsd: Number(((paid * cashbackPct) / 100).toFixed(2)),
      } satisfies Challenge;
    })
    .sort((a, b) => a.price - b.price);
}

export function toFirm(deal: Deal): Firm {
  // The headline rate is the best a member can do at this firm, because that
  // is the number the storefront is comparing. Showing an average would make
  // a firm with one cheap add-on look worse than it is.
  const cashback = deal.products.reduce(
    (best, product) => Math.max(best, product.estCashbackPct ?? 0),
    0,
  );
  // The firm's configured default, not whichever coupon sorted first.
  const coupon = firmCoupon(deal);

  return {
    slug: deal.slug,
    name: deal.name,
    mark: monogram(deal.name),
    logoUrl: deal.logoUrl,
    kind: describeKind(deal),
    markets: (deal.categories ?? []).map((category) => CATEGORY_LABELS[category]),
    cashback: Number(cashback.toFixed(1)),
    discount: coupon.discountPct,
    // Empty when the firm has no published code, and never a house default.
    // A code the firm does not recognise is worse than none: it is applied at
    // checkout, silently ignored, and the purchase arrives unattributed - so
    // no commission is paid and there is no cashback to share. The rest of the
    // storefront treats "" as "no code to show", the same as it already does
    // for an unpublished cashback rate.
    coupon: coupon.code,
    challenges: toChallenges(deal),
    split: deal.profitSplit ?? "-",
    payout: normalisePayout(deal.payoutCadence),
    platform: deal.tradingPlatforms.join("/") || "-",
    ...(deal.fulfillment === "RESELL" ? { tag: "Reseller" as const } : {}),
  };
}

/**
 * The firm's fallback coupon.
 *
 * `defaultCouponCode` is the admin's explicit choice, so it wins over whatever
 * happens to sort first. It used to lose: the code came from `coupons[0]` and
 * `defaultCouponCode` was consulted only when the firm had no active coupon at
 * all - so a firm with two codes advertised whichever the database returned
 * first, and the setting the console offers for exactly this decision did
 * nothing.
 *
 * Worse than arbitrary: the code and the discount came from the same
 * `coupons[0]`, so if the configured default *was* used for the code (no
 * active coupons) the discount silently fell to zero.
 *
 * A `defaultCouponCode` naming a coupon that is no longer ACTIVE deliberately
 * falls through to the ordered list rather than being quoted - a code the
 * checkout will refuse is worse than a different working one.
 */
function firmCoupon(deal: Deal): { code: string; discountPct: number } {
  const configured = deal.defaultCouponCode?.trim().toUpperCase();

  const chosen =
    (configured ? deal.coupons.find((entry) => entry.code.toUpperCase() === configured) : null) ??
    deal.coupons[0];

  if (chosen) return { code: chosen.code, discountPct: Number(chosen.discountPct ?? 0) };

  // No coupon row at all. The bare string still opens the `/go/` redirect, but
  // it carries no discount - quoting one would be inventing it.
  return { code: deal.defaultCouponCode ?? "", discountPct: 0 };
}

/**
 * The code and discount that apply to one challenge.
 *
 * A paused or expired coupon is ignored rather than quoted: the storefront must
 * never print a price cut a checkout will refuse. It falls back the same way
 * the rest of the catalogue does - the challenge's own coupon, then the firm's
 * configured default, then nothing.
 */
export function couponFor(
  deal: Deal,
  product: { coupon?: { code: string; discountPct: string | null; status: string } | null },
): { code: string; discountPct: number } {
  const own = product.coupon;
  if (own && own.status === "ACTIVE") {
    return { code: own.code, discountPct: Number(own.discountPct ?? 0) };
  }

  return firmCoupon(deal);
}

/** "Funded Trading Plus" → "F+"… two letters, as the design specifies. */
function monogram(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** A readable descriptor from the kinds this firm actually sells. */
function describeKind(deal: Deal): string {
  const kinds = [...new Set(deal.products.map((product) => product.kind))];
  const label: Record<string, string> = {
    EVALUATION: "Evaluation",
    INSTANT_FUNDING: "Instant",
    RESET: "Reset",
    ADDON: "Add-on",
    SUBSCRIPTION: "Subscription",
  };
  const named = kinds.map((kind) => label[kind]).filter(Boolean);
  return named.length > 0 ? named.slice(0, 2).join(" · ") : "Challenge";
}

/** The API stores free text; the UI's union is narrower. */
function normalisePayout(cadence: string | null): PayoutCadence {
  const value = (cadence ?? "").toLowerCase();
  if (value.includes("demand")) return "On-demand";
  if (value.includes("bi")) return "Bi-weekly";
  if (value.includes("week")) return "Weekly";
  return "Bi-weekly";
}

export interface PublicStats {
  firmCount: number;
  memberCount: number;
  paidToTradersUsd: string;
}

/**
 * Headline figures, or `null` when we could not ask.
 *
 * This used to fall back to `{ firmCount: 0, memberCount: 0, paidToTradersUsd:
 * "0.00" }`, described as "failure represented as zero, never invented
 * activity". The second half of that is the problem: **zero is invented
 * activity** when the truth is "unknown". The web image builds without a
 * reachable API, so static generation took the fallback every time and baked
 * it into the cached HTML - a built image served `$0 PAID TO TRADERS` and `0
 * FIRMS` as settled fact, with a revalidate window of minutes behind it.
 *
 * Those are the three numbers the landing page exists to make. A visitor who
 * sees them cannot tell a young business from a broken one, and neither can we
 * from a log, because nothing failed: the page rendered a clean 200.
 *
 * `null` is not a number, so nothing downstream can accidentally arithmetic it
 * into a claim. The hero renders a placeholder for it instead of counting up
 * to zero.
 */
export async function fetchStats(): Promise<PublicStats | null> {
  try {
    const response = await apiRequest("/activity/stats", {
      cache: "force-cache",
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    } as RequestInit);

    if (!response.ok) return null;
    return (await response.json()) as PublicStats;
  } catch {
    return null;
  }
}

/**
 * The estimator's catalogue, from real listed challenges.
 *
 * The designed fixture derives prices from a synthetic ladder scaled per firm,
 * which is fine as a placeholder and wrong as an estimate. Here each size is a
 * challenge somebody can actually buy, at the price the firm actually charges,
 * with the cashback rate the split produces.
 */
export function toEstimatorFirms(deals: Deal[]): EstimatorFirm[] {
  return deals
    .map((deal) => {
      const priced = deal.products.filter((product) => Number(product.listPrice) > 0);
      if (priced.length === 0) return null;

      const coupon = firmCoupon(deal);
      const best = priced.reduce(
        (top, product) => Math.max(top, product.estCashbackPct ?? 0),
        0,
      );

      return {
        slug: deal.slug,
        name: deal.name,
        mark: monogram(deal.name),
        logoUrl: deal.logoUrl,
        cashbackPct: Number(best.toFixed(1)),
        discountPct: coupon.discountPct,
        // The same fallback the deals page uses. It was missing here, so the
        // estimator could not name the code even for a firm that publishes one
        // - and a ledger that shows a cashback figure without saying which code
        // earns it is telling somebody half of how to get paid.
        coupon: coupon.code,
        plans: [
          ...new Set(
            priced.map((product) => product.family?.trim() || planLabel(product.kind)),
          ),
        ],
        products: priced
          .map((product) => ({
            slug: product.slug,
            plan: product.family?.trim() || planLabel(product.kind),
            label: product.accountSize
              ? `$${Math.round(product.accountSize / 1000)}K`
              : product.name,
            // Not rounded. The ledger prints this as CHALLENGE PRICE, so a
            // $199.99 plan was being quoted at $200.00 - a misquoted price on
            // the one screen whose entire job is telling somebody what they
            // will pay. `moneyCompact` already refuses to round for exactly
            // this reason; this was the one place that did.
            price: Number(product.listPrice),
            cashbackPct: Number((product.estCashbackPct ?? 0).toFixed(2)),
          }))
          .sort((a, b) => a.price - b.price),
      } satisfies EstimatorFirm;
    })
    .filter((firm): firm is EstimatorFirm => firm !== null);
}

function planLabel(kind: string): string {
  const labels: Record<string, string> = {
    EVALUATION: "Evaluation",
    INSTANT_FUNDING: "Instant",
    RESET: "Reset",
    ADDON: "Add-on",
    SUBSCRIPTION: "Subscription",
  };
  return labels[kind] ?? "Challenge";
}

/** Only listed, priced challenges may be used for estimates. */
export async function fetchEstimatorFirms(): Promise<EstimatorFirm[]> {
  return toEstimatorFirms(await fetchDeals());
}

/** What the claim form needs: the firm's id, name and best rate. */
export function toClaimPlatforms(deals: Deal[]) {
  return deals.map((deal) => ({
    id: deal.id,
    slug: deal.slug,
    name: deal.name,
    cashbackPct: Number(
      deal.products.reduce((best, product) => Math.max(best, product.estCashbackPct ?? 0), 0).toFixed(1),
    ),
    supportsSubId: Boolean(deal.supportsSubId),
    /**
     * What this firm actually sells, so the claim form can offer it rather
     * than asking somebody to retype it.
     *
     * `family` is the firm's own account type - LucidPro, LucidFlex and so on.
     * It groups the list, which is how a member finds their plan: they
     * remember the type they bought long before the exact size.
     */
    plans: deal.products.map((product) => ({
      name: product.name,
      family: product.family,
      listPrice: product.listPrice,
    })),
    /**
     * Whose coupon was used. Almost always exactly one, which is why the
     * field is a select and not a text box - a mistyped code is a claim that
     * cannot be attributed.
     */
    coupons: deal.coupons.map((coupon) => coupon.code),
  }));
}
