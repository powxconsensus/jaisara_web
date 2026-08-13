import { challengeMath } from "@/lib/format";

/**
 * The hero receipt feed. In production this is a live feed of recent approved
 * claims, showing first-initial + surname only - never a full name or email
 * (handoff §2).
 *
 * Only `paid` and `pending` appear here. Rejections belong in the wallet ledger
 * and the admin queue: surfacing them on the landing page undercuts the pitch.
 */

export type ReceiptStatus = "paid" | "pending";

export interface Receipt {
  firm: string;
  plan: string;
  coupon: string;
  /** List price before the coupon. */
  list: number;
  /** Coupon discount, percent. */
  discountPct: number;
  /** Cashback rate, percent. */
  cashbackPct: number;
  who: string;
  ago: string;
  id: string;
  status: ReceiptStatus;
  /**
   * The cashback actually credited, when this receipt came from a real
   * conversion.
   *
   * The designed receipts describe a rate and let the card do the arithmetic.
   * A real one already knows the answer to the cent, and re-deriving it from a
   * rounded percentage prints a number that disagrees with the member's wallet
   * - 6.7% of $99 is $6.63, but $6.68 was credited.
   */
  cashbackUsd?: number;
}

/**
 * What the hero shows before there is a single approved claim to show.
 *
 * The card used to blank every figure into bullets, which made the most
 * important object on the page unreadable at exactly the moment a first-time
 * visitor was deciding whether the product does anything. These are worked
 * figures instead - the same arithmetic the estimator runs, on real list
 * prices - and they are replaced by the live feed the moment it returns a row.
 *
 * The card is deliberately NOT badged as a sample. What keeps it honest is
 * that it makes no claim to badge: `who`, `ago` and `id` are all blank and
 * `ReceiptCard` does not print them in this mode, so there is no member, no
 * timestamp and no order reference. It shows what the coupon and the cashback
 * rate do to a price, which is true of every one of these firms.
 *
 * Leave those three fields empty. A name here would be a fabricated
 * testimonial and a reference number would be indistinguishable from a real
 * order - those are the two things that would turn worked figures into a lie.
 */
export const SAMPLE_RECEIPTS: Receipt[] = [
  { firm: "FundingPips", plan: "$10K Two-Step", coupon: "JAISARA20", list: 129, discountPct: 20, cashbackPct: 14, who: "", ago: "", id: "", status: "paid" },
  { firm: "FTMO", plan: "$25K Swing", coupon: "JAISARA15", list: 289, discountPct: 15, cashbackPct: 10, who: "", ago: "", id: "", status: "pending" },
  { firm: "The5ers", plan: "$20K Hyper Growth", coupon: "JAISARA10", list: 165, discountPct: 10, cashbackPct: 12, who: "", ago: "", id: "", status: "paid" },
];

/** Each status drives the stamp, accent, who-line, footer and dot together. */
export const RECEIPT_STATUS: Record<
  ReceiptStatus,
  { stamp: string; color: string; who: string; footer: string; dot: string }
> = {
  paid: {
    stamp: "PAID ✓",
    color: "var(--primary)",
    who: "CASHBACK PAID OUT",
    footer: "CLEARED · SENT TO WALLET",
    dot: "var(--success)",
  },
  pending: {
    stamp: "PENDING",
    color: "var(--warning)",
    who: "CASHBACK APPROVED",
    footer: "AVAILABLE AFTER THE FIRM'S REFUND WINDOW · VOID ON REFUND",
    dot: "var(--warning)",
  },
};

/** Derived figures for one receipt - except a real credited amount, which wins. */
export function receiptTotals(receipt: Receipt) {
  const totals = challengeMath(receipt.list, receipt.discountPct, receipt.cashbackPct);
  return receipt.cashbackUsd === undefined
    ? totals
    : { ...totals, cashback: receipt.cashbackUsd };
}

/** Rotation interval, ms (handoff §2). */
export const RECEIPT_INTERVAL_MS = 5600;
