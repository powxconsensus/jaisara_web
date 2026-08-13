import { apiRequest } from "@/lib/auth-server";
import type { Firm, PayoutCadence } from "@/lib/data/firms";
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

export function toFirm(deal: Deal): Firm {
  // The headline rate is the best a member can do at this firm, because that
  // is the number the storefront is comparing. Showing an average would make
  // a firm with one cheap add-on look worse than it is.
  const cashback = deal.products.reduce(
    (best, product) => Math.max(best, product.estCashbackPct ?? 0),
    0,
  );
  const coupon = deal.coupons[0];

  return {
    slug: deal.slug,
    name: deal.name,
    mark: monogram(deal.name),
    logoUrl: deal.logoUrl,
    kind: describeKind(deal),
    markets: (deal.categories ?? []).map((category) => CATEGORY_LABELS[category]),
    cashback: Number(cashback.toFixed(1)),
    discount: Number(coupon?.discountPct ?? 0),
    coupon: coupon?.code ?? deal.defaultCouponCode ?? "JAISARA",
    split: deal.profitSplit ?? "-",
    payout: normalisePayout(deal.payoutCadence),
    platform: deal.tradingPlatforms.join("/") || "-",
    ...(deal.fulfillment === "RESELL" ? { tag: "Reseller" as const } : {}),
  };
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

/** Headline figures. Failure is represented as zero, never invented activity. */
export async function fetchStats(): Promise<PublicStats> {
  const fallback: PublicStats = { firmCount: 0, memberCount: 0, paidToTradersUsd: "0.00" };

  try {
    const response = await apiRequest("/activity/stats", {
      cache: "force-cache",
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    } as RequestInit);

    if (!response.ok) return fallback;
    return (await response.json()) as PublicStats;
  } catch {
    return fallback;
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

      const coupon = deal.coupons[0];
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
        discountPct: Number(coupon?.discountPct ?? 0),
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
            price: Math.round(Number(product.listPrice)),
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
