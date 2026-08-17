/**
 * Firm / deal catalogue.
 *
 * Static fixtures standing in for the API (`api` repo) - every field here maps
 * to a column in the planned `PropFirm` / `Coupon` tables. Swap the exported
 * accessors for fetches when the backend lands; nothing else needs to change.
 */

import { BRAND_COUPON } from "@/lib/brand";

export type FirmKind = "Two-step" | "One-step" | "Instant" | "Three-step";
export type PayoutCadence = "Weekly" | "Bi-weekly" | "On-demand";

/**
 * One thing a member can actually buy.
 *
 * The unit the storefront was missing. Everything above this - a firm's
 * headline rate, the deals index, the estimator - is an aggregate over these,
 * and an aggregate is not what somebody is shopping for: they want a $50K
 * futures account and the answer to "which firm pays me most for it".
 *
 * `cashbackUsd` is carried rather than derived at render time so the figure is
 * computed once, from the price and the rate, in the same place for every
 * surface. Two components rounding the same multiplication differently is how
 * a deals row and a firm page end up quoting different money.
 */
export interface Challenge {
  slug: string;
  /** The firm this belongs to - set when challenges are pooled across firms. */
  firmSlug: string;
  firmName: string;
  firmMark: string;
  firmLogoUrl?: string | null;
  /** The firm's own product name, e.g. `50K Pro Eval`. */
  name: string;
  /** The family it belongs to, e.g. `LucidPro`. Null when the firm has none. */
  plan: string | null;
  /** `$50K`, or null for a product with no account size (a reset, an add-on). */
  size: string | null;
  /** Sorts by real size; nulls sort last. */
  accountSize: number | null;
  price: number;
  currency: string;
  cashbackPct: number;
  cashbackUsd: number;
}

export interface Firm {
  /** URL slug, e.g. `fundingpips`. */
  slug: string;
  name: string;
  /** Two-letter monogram, shown when the firm has no logo uploaded. */
  mark: string;
  /** The firm's logo, when the catalogue has one. */
  logoUrl?: string | null;
  /** Free-text descriptor shown under the name, e.g. "Two-step · instant". */
  kind: string;
  /** Markets the firm deals in. Optional: older static rows carry none. */
  markets?: string[];
  /** Percentage of the order value returned to the buyer. */
  cashback: number;
  /** Percentage taken off at the firm's checkout. */
  discount: number;
  /** The firm's published code, or `""` when it has none. Never invented. */
  coupon: string;
  /**
   * What this firm sells, cheapest first. Empty for a firm whose catalogue has
   * not been filled in yet - which is a real state, not an error, and every
   * surface has to render it as "nothing listed yet" rather than as zero.
   */
  challenges?: Challenge[];
  tag?: "Top pick" | "Popular" | "Reseller" | "New";
  /** The trader's profit split at the firm. */
  split: string;
  payout: PayoutCadence;
  platform: string;
}

/**
 * Every challenge across a set of firms, pooled.
 *
 * Lives here rather than in `deals.ts` because it is a pure operation on the
 * `Firm` shape, and `deals.ts` reaches the API through `next/headers` - which
 * makes importing anything from it into a client component a build error.
 *
 * The cross-firm question it serves - "I want a $50K futures account, who pays
 * me most?" - cannot be answered by the by-firm view, because a firm's
 * headline rate is the best of its products rather than the rate on the one
 * being bought.
 */
export function toAllChallenges(firms: Firm[]): Challenge[] {
  return firms.flatMap((firm) => firm.challenges ?? []);
}

/** No size chosen: every figure on the page is a range rather than a pick. */
export const ANY_SIZE = "Any";

export interface SizeBucket {
  /** Already carries its currency mark, e.g. `$50K`. */
  label: string;
  accountSize: number;
  count: number;
}

/**
 * The account sizes somebody can actually buy, smallest first.
 *
 * Derived from the catalogue rather than declared, because a fixed ladder
 * offers sizes nobody sells - and a filter that can only return nothing is
 * indistinguishable from a broken one.
 */
export function sizeBuckets(challenges: Challenge[]): SizeBucket[] {
  const found = new Map<string, SizeBucket>();

  for (const challenge of challenges) {
    if (!challenge.size || !challenge.accountSize) continue;
    const seen = found.get(challenge.size);
    if (seen) seen.count += 1;
    else found.set(challenge.size, { label: challenge.size, accountSize: challenge.accountSize, count: 1 });
  }

  return [...found.values()].sort((a, b) => a.accountSize - b.accountSize);
}

/**
 * What this firm would pay on an account of the chosen size.
 *
 * The whole point of the size basis: once somebody says "$50K", every figure
 * on the page has to describe a $50K account. A firm selling nothing at that
 * size returns null and says so, rather than quietly answering with a
 * different product - which is the failure this replaces, where every firm was
 * represented by its single most expensive challenge.
 *
 * A firm with several products at one size (a one-step and a two-step $50K)
 * resolves to the one that pays most, then the cheaper of equals. That is a
 * defensible "best at this size" because the size is held fixed - unlike a
 * best-across-all-sizes, which is only ever the biggest account.
 */
export function challengeAtSize(firm: Firm, size: string): Challenge | null {
  const matches = (firm.challenges ?? []).filter((challenge) => challenge.size === size);
  if (matches.length === 0) return null;

  return matches.reduce((best, challenge) => {
    if (challenge.cashbackUsd !== best.cashbackUsd) {
      return challenge.cashbackUsd > best.cashbackUsd ? challenge : best;
    }
    return challenge.price < best.price ? challenge : best;
  });
}

export interface FirmRange {
  minPrice: number;
  maxPrice: number;
  count: number;
  /** Null when no challenge here has a published rate - never a zero range. */
  cashback: { minUsd: number; maxUsd: number; minPct: number; maxPct: number } | null;
}

/**
 * The spread across a firm's catalogue, for when no size is chosen.
 *
 * A range is the honest answer to "what does this firm pay" when the question
 * has not been narrowed: it states both ends instead of quietly reporting the
 * top one, and it tells somebody whether the firm is consistent or whether the
 * headline belongs to a single expensive outlier.
 */
export function firmRange(firm: Firm): FirmRange | null {
  const challenges = firm.challenges ?? [];
  if (challenges.length === 0) return null;

  const prices = challenges.map((challenge) => challenge.price);
  const rated = challenges.filter((challenge) => challenge.cashbackUsd > 0);

  return {
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
    count: challenges.length,
    cashback:
      rated.length > 0
        ? {
            minUsd: Math.min(...rated.map((c) => c.cashbackUsd)),
            maxUsd: Math.max(...rated.map((c) => c.cashbackUsd)),
            minPct: Math.min(...rated.map((c) => c.cashbackPct)),
            maxPct: Math.max(...rated.map((c) => c.cashbackPct)),
          }
        : null,
  };
}

export const FIRMS: Firm[] = [
  { slug: "fundingpips", name: "FundingPips", mark: "FP", kind: "Two-step · instant", cashback: 14, discount: 20, coupon: BRAND_COUPON, tag: "Top pick", split: "80%", payout: "Bi-weekly", platform: "MT5" },
  { slug: "ftmo", name: "FTMO", mark: "FT", kind: "Two-step · swing", cashback: 10, discount: 15, coupon: BRAND_COUPON, tag: "Popular", split: "80%", payout: "Bi-weekly", platform: "MT4/MT5" },
  { slug: "the5ers", name: "The5ers", mark: "T5", kind: "Instant · hyper growth", cashback: 12, discount: 10, coupon: BRAND_COUPON, tag: "Reseller", split: "80%", payout: "Weekly", platform: "MT5" },
  { slug: "alpha-capital", name: "Alpha Capital", mark: "AC", kind: "One-step", cashback: 16, discount: 25, coupon: BRAND_COUPON, tag: "Top pick", split: "80%", payout: "Bi-weekly", platform: "MT5" },
  { slug: "fundednext", name: "FundedNext", mark: "FN", kind: "Two-step · stellar", cashback: 8, discount: 12, coupon: BRAND_COUPON, tag: "Popular", split: "90%", payout: "On-demand", platform: "MT4/MT5" },
  { slug: "blueberry-funded", name: "Blueberry Funded", mark: "BF", kind: "Two-step", cashback: 11, discount: 15, coupon: BRAND_COUPON, split: "85%", payout: "Weekly", platform: "MT5" },
  { slug: "maven-trading", name: "Maven Trading", mark: "MV", kind: "One-step · instant", cashback: 15, discount: 18, coupon: BRAND_COUPON, tag: "New", split: "80%", payout: "Weekly", platform: "cTrader" },
  { slug: "goat-funded", name: "Goat Funded", mark: "GF", kind: "Two-step", cashback: 9, discount: 20, coupon: BRAND_COUPON, split: "85%", payout: "On-demand", platform: "MT5" },
  { slug: "e8-markets", name: "E8 Markets", mark: "E8", kind: "Three-step", cashback: 13, discount: 14, coupon: BRAND_COUPON, tag: "Popular", split: "80%", payout: "Bi-weekly", platform: "MT5" },
  { slug: "funded-trading-plus", name: "Funded Trading Plus", mark: "F+", kind: "Instant", cashback: 12, discount: 15, coupon: BRAND_COUPON, split: "90%", payout: "On-demand", platform: "MT5" },
  { slug: "city-traders-imperium", name: "City Traders Imperium", mark: "CT", kind: "Two-step · swing", cashback: 10, discount: 10, coupon: BRAND_COUPON, split: "90%", payout: "Weekly", platform: "MT5" },
  { slug: "audacity-capital", name: "Audacity Capital", mark: "AU", kind: "One-step", cashback: 9, discount: 12, coupon: BRAND_COUPON, split: "85%", payout: "Bi-weekly", platform: "MT4" },
  { slug: "lark-funding", name: "Lark Funding", mark: "LK", kind: "Instant", cashback: 14, discount: 15, coupon: BRAND_COUPON, split: "80%", payout: "Weekly", platform: "cTrader" },
  { slug: "surgetrader", name: "SurgeTrader", mark: "SG", kind: "One-step", cashback: 8, discount: 10, coupon: BRAND_COUPON, split: "90%", payout: "Bi-weekly", platform: "MT4/MT5" },
  { slug: "ment-funding", name: "Ment Funding", mark: "MN", kind: "Instant", cashback: 11, discount: 12, coupon: BRAND_COUPON, split: "75%", payout: "Weekly", platform: "MT5" },
  { slug: "toro-challenge", name: "Toro Challenge", mark: "TR", kind: "Two-step", cashback: 13, discount: 18, coupon: BRAND_COUPON, tag: "New", split: "80%", payout: "Bi-weekly", platform: "MT5" },
  { slug: "nova-funding", name: "Nova Funding", mark: "NV", kind: "Two-step", cashback: 10, discount: 14, coupon: BRAND_COUPON, split: "85%", payout: "Weekly", platform: "MT5" },
  { slug: "apex-trader-funding", name: "Apex Trader Funding", mark: "AP", kind: "One-step · futures", cashback: 15, discount: 20, coupon: BRAND_COUPON, tag: "Popular", split: "90%", payout: "Weekly", platform: "Tradovate" },
  { slug: "take-profit-trader", name: "Take Profit Trader", mark: "TP", kind: "One-step · futures", cashback: 12, discount: 15, coupon: BRAND_COUPON, split: "80%", payout: "On-demand", platform: "Tradovate" },
  { slug: "myfundedfx", name: "MyFundedFX", mark: "MF", kind: "Two-step", cashback: 11, discount: 16, coupon: BRAND_COUPON, split: "85%", payout: "Bi-weekly", platform: "MT5" },
  { slug: "glow-node", name: "Glow Node", mark: "GN", kind: "Two-step", cashback: 12, discount: 12, coupon: BRAND_COUPON, split: "85%", payout: "Weekly", platform: "MT5" },
  { slug: "smart-prop-trader", name: "Smart Prop Trader", mark: "SP", kind: "Two-step", cashback: 9, discount: 15, coupon: BRAND_COUPON, split: "85%", payout: "Bi-weekly", platform: "MT5" },
  { slug: "bespoke-funding", name: "Bespoke Funding", mark: "BK", kind: "Instant", cashback: 10, discount: 12, coupon: BRAND_COUPON, split: "80%", payout: "On-demand", platform: "MT4/MT5" },
  { slug: "funding-traders", name: "Funding Traders", mark: "FD", kind: "One-step", cashback: 14, discount: 22, coupon: BRAND_COUPON, tag: "New", split: "80%", payout: "Weekly", platform: "MT5" },
];

/** The "N FIRMS INDEXED" claim must match the real dataset (handoff §4.2). */
export const FIRM_COUNT = FIRMS.length;

export function getFirm(slug: string): Firm | undefined {
  return FIRMS.find((firm) => firm.slug === slug);
}

/** Top firms for the landing index, sorted by cashback descending. */
export function topFirmsByCashback(limit: number): Firm[] {
  return [...FIRMS].sort((a, b) => b.cashback - a.cashback).slice(0, limit);
}
