/**
 * Firm / deal catalogue.
 *
 * Static fixtures standing in for the API (`api` repo) — every field here maps
 * to a column in the planned `PropFirm` / `Coupon` tables. Swap the exported
 * accessors for fetches when the backend lands; nothing else needs to change.
 */

export type FirmKind = "Two-step" | "One-step" | "Instant" | "Three-step";
export type PayoutCadence = "Weekly" | "Bi-weekly" | "On-demand";

export interface Firm {
  /** URL slug, e.g. `fundingpips`. */
  slug: string;
  name: string;
  /** Two-letter monogram, the placeholder for a real logo (handoff §8). */
  mark: string;
  /** Free-text descriptor shown under the name, e.g. "Two-step · instant". */
  kind: string;
  /** Percentage of the order value returned to the buyer. */
  cashback: number;
  /** Percentage taken off at the firm's checkout. */
  discount: number;
  coupon: string;
  tag?: "Top pick" | "Popular" | "Reseller" | "New";
  /** The trader's profit split at the firm. */
  split: string;
  payout: PayoutCadence;
  platform: string;
}

export const FIRMS: Firm[] = [
  { slug: "fundingpips", name: "FundingPips", mark: "FP", kind: "Two-step · instant", cashback: 14, discount: 20, coupon: "JAISARA20", tag: "Top pick", split: "80%", payout: "Bi-weekly", platform: "MT5" },
  { slug: "ftmo", name: "FTMO", mark: "FT", kind: "Two-step · swing", cashback: 10, discount: 15, coupon: "JAISARA15", tag: "Popular", split: "80%", payout: "Bi-weekly", platform: "MT4/MT5" },
  { slug: "the5ers", name: "The5ers", mark: "T5", kind: "Instant · hyper growth", cashback: 12, discount: 10, coupon: "JAISARA10", tag: "Reseller", split: "80%", payout: "Weekly", platform: "MT5" },
  { slug: "alpha-capital", name: "Alpha Capital", mark: "AC", kind: "One-step", cashback: 16, discount: 25, coupon: "JSR-ALPHA", tag: "Top pick", split: "80%", payout: "Bi-weekly", platform: "MT5" },
  { slug: "fundednext", name: "FundedNext", mark: "FN", kind: "Two-step · stellar", cashback: 8, discount: 12, coupon: "JAISARA12", tag: "Popular", split: "90%", payout: "On-demand", platform: "MT4/MT5" },
  { slug: "blueberry-funded", name: "Blueberry Funded", mark: "BF", kind: "Two-step", cashback: 11, discount: 15, coupon: "JSR-BLUE", split: "85%", payout: "Weekly", platform: "MT5" },
  { slug: "maven-trading", name: "Maven Trading", mark: "MV", kind: "One-step · instant", cashback: 15, discount: 18, coupon: "JSR-MAVEN", tag: "New", split: "80%", payout: "Weekly", platform: "cTrader" },
  { slug: "goat-funded", name: "Goat Funded", mark: "GF", kind: "Two-step", cashback: 9, discount: 20, coupon: "JSR-GOAT", split: "85%", payout: "On-demand", platform: "MT5" },
  { slug: "e8-markets", name: "E8 Markets", mark: "E8", kind: "Three-step", cashback: 13, discount: 14, coupon: "JSR-E8", tag: "Popular", split: "80%", payout: "Bi-weekly", platform: "MT5" },
  { slug: "funded-trading-plus", name: "Funded Trading Plus", mark: "F+", kind: "Instant", cashback: 12, discount: 15, coupon: "JSR-FTP", split: "90%", payout: "On-demand", platform: "MT5" },
  { slug: "city-traders-imperium", name: "City Traders Imperium", mark: "CT", kind: "Two-step · swing", cashback: 10, discount: 10, coupon: "JSR-CTI", split: "90%", payout: "Weekly", platform: "MT5" },
  { slug: "audacity-capital", name: "Audacity Capital", mark: "AU", kind: "One-step", cashback: 9, discount: 12, coupon: "JSR-AUD", split: "85%", payout: "Bi-weekly", platform: "MT4" },
  { slug: "lark-funding", name: "Lark Funding", mark: "LK", kind: "Instant", cashback: 14, discount: 15, coupon: "JSR-LARK", split: "80%", payout: "Weekly", platform: "cTrader" },
  { slug: "surgetrader", name: "SurgeTrader", mark: "SG", kind: "One-step", cashback: 8, discount: 10, coupon: "JSR-SURGE", split: "90%", payout: "Bi-weekly", platform: "MT4/MT5" },
  { slug: "ment-funding", name: "Ment Funding", mark: "MN", kind: "Instant", cashback: 11, discount: 12, coupon: "JSR-MENT", split: "75%", payout: "Weekly", platform: "MT5" },
  { slug: "toro-challenge", name: "Toro Challenge", mark: "TR", kind: "Two-step", cashback: 13, discount: 18, coupon: "JSR-TORO", tag: "New", split: "80%", payout: "Bi-weekly", platform: "MT5" },
  { slug: "nova-funding", name: "Nova Funding", mark: "NV", kind: "Two-step", cashback: 10, discount: 14, coupon: "JSR-NOVA", split: "85%", payout: "Weekly", platform: "MT5" },
  { slug: "apex-trader-funding", name: "Apex Trader Funding", mark: "AP", kind: "One-step · futures", cashback: 15, discount: 20, coupon: "JSR-APEX", tag: "Popular", split: "90%", payout: "Weekly", platform: "Tradovate" },
  { slug: "take-profit-trader", name: "Take Profit Trader", mark: "TP", kind: "One-step · futures", cashback: 12, discount: 15, coupon: "JSR-TPT", split: "80%", payout: "On-demand", platform: "Tradovate" },
  { slug: "myfundedfx", name: "MyFundedFX", mark: "MF", kind: "Two-step", cashback: 11, discount: 16, coupon: "JSR-MFFX", split: "85%", payout: "Bi-weekly", platform: "MT5" },
  { slug: "glow-node", name: "Glow Node", mark: "GN", kind: "Two-step", cashback: 12, discount: 12, coupon: "JSR-GLOW", split: "85%", payout: "Weekly", platform: "MT5" },
  { slug: "smart-prop-trader", name: "Smart Prop Trader", mark: "SP", kind: "Two-step", cashback: 9, discount: 15, coupon: "JSR-SMART", split: "85%", payout: "Bi-weekly", platform: "MT5" },
  { slug: "bespoke-funding", name: "Bespoke Funding", mark: "BK", kind: "Instant", cashback: 10, discount: 12, coupon: "JSR-BSPK", split: "80%", payout: "On-demand", platform: "MT4/MT5" },
  { slug: "funding-traders", name: "Funding Traders", mark: "FD", kind: "One-step", cashback: 14, discount: 22, coupon: "JSR-FDTR", tag: "New", split: "80%", payout: "Weekly", platform: "MT5" },
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
