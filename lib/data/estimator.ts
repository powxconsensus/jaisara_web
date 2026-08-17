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

/** A stable per-firm price multiplier in the 0.8-1.22 range. */
function priceFactor(firm: Firm): number {
  return 0.8 + ((firm.cashback * 3 + firm.discount) % 8) * 0.06;
}

export interface EstimatorSize {
  slug: string;
  plan: string;
  label: string;
  price: number;
  cashbackPct: number;
}

export interface EstimatorFirm {
  slug: string;
  name: string;
  mark: string;
  logoUrl: string | null;
  cashbackPct: number;
  discountPct: number;
  /**
   * The code that makes the purchase ours to be paid on.
   *
   * Not the same thing as `discountPct`, and the reason the ledger has to name
   * it: a firm can publish a code that takes nothing off the price and exists
   * purely so the sale is attributed. Without the code there is no commission,
   * so there is no cashback either - a discount of zero says nothing about
   * whether cashback happens.
   */
  coupon: string;
  plans: string[];
  products: EstimatorSize[];
}

export const ESTIMATOR_FIRMS: EstimatorFirm[] = FIRMS.map((firm) => ({
  slug: firm.slug,
  name: firm.name,
  mark: firm.mark,
  logoUrl: firm.logoUrl ?? null,
  cashbackPct: firm.cashback,
  discountPct: firm.discount,
  coupon: firm.coupon,
  plans: plansFor(firm.kind),
  products: plansFor(firm.kind).flatMap((plan) =>
    BASE_SIZES.map((size) => ({
      slug: `${firm.slug}-${plan.toLowerCase().replace(/\s+/g, "-")}-${size.label}`,
      plan,
      label: size.label,
      price: Math.round(size.price * priceFactor(firm)),
      cashbackPct: firm.cashback,
    })),
  ),
}));

/** Optional Club boost applied on top of the base cashback. */
export const CLUB_TIERS = [
  { label: "Not a member", multiplier: 0 },
  { label: "Tier 2 · +20%", multiplier: 0.2 },
  { label: "Tier 3 · +25%", multiplier: 0.25 },
] as const;

export interface EstimateInput {
  firm: EstimatorFirm;
  product: EstimatorSize;
  tierIndex: number;
}

/**
 * The result ledger. `youPay` is the real amount charged at the firm's
 * checkout; `cashback` lands only after the refund window closes.
 *
 * Cashback is a share of the commission the firm pays us, and a firm pays
 * commission on **what it actually charged** - so this is a percentage of
 * `youPay`, not of the list price. Taking it off the list price quoted a
 * member more than the sale could ever earn, by exactly the discount: on a
 * $150 plan at 20% off it over-promised 20% of the cashback. Harmless while
 * every coupon sat at 0% off, and wrong the moment one is published.
 */
export function estimate({ firm, product, tierIndex }: EstimateInput) {
  const price = product.price;
  const discount = (price * firm.discountPct) / 100;
  const youPay = price - discount;
  const baseCashback = (youPay * product.cashbackPct) / 100;
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
