import { FIRMS, type Firm } from "./firms";

/**
 * Estimator catalogue: which challenge types and account sizes each firm sells,
 * and what they cost. Prices are derived from a base ladder scaled per firm so
 * the dataset stays coherent without hand-maintaining 24 × 5 prices.
 */

const BASE_SIZES: { label: string; price: number }[] = [
  { label: "$10K", price: 89 },
  { label: "$25K", price: 187 },
  { label: "$50K", price: 289 },
  { label: "$100K", price: 479 },
  { label: "$200K", price: 939 },
];

/** Challenge types on offer, inferred from the firm's descriptor. */
function plansFor(kind: string): string[] {
  const k = kind.toLowerCase();
  if (k.includes("futures")) return ["Evaluation", "Pro"];
  if (k.includes("one")) return ["One-step", "Two-step"];
  if (k.includes("instant")) return ["Instant", "Two-step"];
  if (k.includes("three")) return ["Three-step", "Two-step"];
  return ["Two-step", "Swing"];
}

/** A stable per-firm price multiplier in the 0.8–1.22 range. */
function priceFactor(firm: Firm): number {
  return 0.8 + ((firm.cashback * 3 + firm.discount) % 8) * 0.06;
}

export interface EstimatorSize {
  label: string;
  price: number;
}

export interface EstimatorFirm {
  slug: string;
  name: string;
  mark: string;
  cashbackPct: number;
  discountPct: number;
  plans: string[];
  sizes: EstimatorSize[];
}

export const ESTIMATOR_FIRMS: EstimatorFirm[] = FIRMS.map((firm) => ({
  slug: firm.slug,
  name: firm.name,
  mark: firm.mark,
  cashbackPct: firm.cashback,
  discountPct: firm.discount,
  plans: plansFor(firm.kind),
  sizes: BASE_SIZES.map((size) => ({
    label: size.label,
    price: Math.round(size.price * priceFactor(firm)),
  })),
}));

/** Optional Club boost applied on top of the base cashback. */
export const CLUB_TIERS = [
  { label: "Not a member", multiplier: 0 },
  { label: "Tier 2 · +20%", multiplier: 0.2 },
  { label: "Tier 3 · +25%", multiplier: 0.25 },
] as const;

export interface EstimateInput {
  firm: EstimatorFirm;
  sizeIndex: number;
  tierIndex: number;
}

/**
 * The result ledger. `youPay` is the real amount charged at the firm's
 * checkout; `cashback` lands only after the refund window closes.
 */
export function estimate({ firm, sizeIndex, tierIndex }: EstimateInput) {
  const price = firm.sizes[sizeIndex].price;
  const discount = (price * firm.discountPct) / 100;
  const youPay = price - discount;
  const baseCashback = (price * firm.cashbackPct) / 100;
  const clubBonus = baseCashback * (CLUB_TIERS[tierIndex]?.multiplier ?? 0);
  const cashback = baseCashback + clubBonus;

  return {
    price,
    discount,
    youPay,
    baseCashback,
    clubBonus,
    cashback,
    effectiveCost: youPay - cashback,
  };
}
