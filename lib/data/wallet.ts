/**
 * Wallet fixtures. Cashback amounts must be computed server-side from
 * firm rate × verified order amount — never trusted from the client
 * (handoff §7). These stand in until the API lands.
 */

export type LedgerStatus = "Pending" | "Available" | "Paid" | "Rejected";

export interface LedgerRow {
  firm: string;
  mark: string;
  plan: string;
  date: string;
  amount: number;
  status: LedgerStatus;
}

export interface WalletSummary {
  available: number;
  pending: number;
  lifetime: number;
  fromClub: number;
}

export const WALLET: WalletSummary = {
  available: 184.5,
  pending: 33.75,
  lifetime: 412.85,
  fromClub: 96.4,
};

export const LEDGER: LedgerRow[] = [
  { firm: "FundingPips", mark: "FP", plan: "$10K Two-Step", date: "Jul 24", amount: 19.6, status: "Available" },
  { firm: "FTMO", mark: "FT", plan: "$25K Swing", date: "Jul 18", amount: 33.75, status: "Pending" },
  { firm: "The5ers", mark: "T5", plan: "$20K Hyper Growth", date: "Jul 09", amount: 24.0, status: "Paid" },
  { firm: "Alpha Capital", mark: "AC", plan: "$50K One-Step", date: "Jun 30", amount: 41.25, status: "Paid" },
  { firm: "FundedNext", mark: "FN", plan: "$15K Stellar", date: "Jun 21", amount: 11.4, status: "Rejected" },
];

/** Status → semantic token. Colour is always paired with the label. */
export const STATUS_TONE: Record<LedgerStatus, "warning" | "success" | "info" | "danger"> = {
  Pending: "warning",
  Available: "success",
  Paid: "info",
  Rejected: "danger",
};

export const ACCOUNT = {
  displayName: "Rahul Sharma",
  email: "rahul@example.com",
  referralCode: "RAHUL-8K2",
};

/** Jaisara Club state. */
export const CLUB = {
  referred: 7,
  active: 4,
  earnings: 96.4,
  tier: 2,
  nextTierAt: 9,
  referrals: [
    { name: "A. Mehta", joined: "Jul 22", earned: 18.4, active: true },
    { name: "D. Kapoor", joined: "Jul 11", earned: 33.9, active: true },
    { name: "S. Rao", joined: "Jun 28", earned: 24.1, active: true },
    { name: "N. Bhat", joined: "Jun 14", earned: 20.0, active: true },
    { name: "P. Nair", joined: "May 30", earned: 0, active: false },
  ],
};
