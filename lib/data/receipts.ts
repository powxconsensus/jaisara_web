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

export const RECEIPTS: Receipt[] = [
  { firm: "FundingPips", plan: "$10K Two-Step", coupon: "JAISARA20", list: 129, discountPct: 20, cashbackPct: 14, who: "R. SHARMA", ago: "JUST NOW", id: "#8842190", status: "pending" },
  { firm: "FTMO", plan: "$25K Swing", coupon: "JAISARA15", list: 289, discountPct: 15, cashbackPct: 10, who: "A. MEHTA", ago: "4 MIN AGO", id: "#8842186", status: "paid" },
  { firm: "Alpha Capital", plan: "$50K One-Step", coupon: "JSR-ALPHA", list: 249, discountPct: 25, cashbackPct: 16, who: "D. KAPOOR", ago: "11 MIN AGO", id: "#8842171", status: "pending" },
  { firm: "The5ers", plan: "$20K Hyper Growth", coupon: "JAISARA10", list: 165, discountPct: 10, cashbackPct: 12, who: "S. RAO", ago: "18 MIN AGO", id: "#8842160", status: "paid" },
  { firm: "Maven Trading", plan: "$15K Instant", coupon: "JSR-MAVEN", list: 119, discountPct: 18, cashbackPct: 15, who: "N. BHAT", ago: "26 MIN AGO", id: "#8842148", status: "paid" },
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
