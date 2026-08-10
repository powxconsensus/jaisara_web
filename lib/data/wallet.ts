/**
 * Wallet vocabulary.
 *
 * What used to live here was a set of fixtures — a $184.50 balance, a ledger
 * of invented cashback, a club standing — that every screen read while the API
 * was being built. They are gone: balances now come from `useWallet`, the
 * ledger from `/api/wallet/history`, and club standing from `/api/club`.
 *
 * Only the shared vocabulary remains, because a fixture that outlives its
 * purpose does not sit harmlessly in a file. It gets imported by the next
 * component somebody writes in a hurry, and then a real member is looking at
 * somebody else's balance.
 */

export type LedgerStatus = "Pending" | "Available" | "Paid" | "Rejected";

/** Status → semantic token. Colour is always paired with the label. */
export const STATUS_TONE: Record<LedgerStatus, "warning" | "success" | "info" | "danger"> = {
  Pending: "warning",
  Available: "success",
  Paid: "info",
  Rejected: "danger",
};
