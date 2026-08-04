/** Admin claim queue fixtures. */

export type ClaimStatus = "Pending" | "Approved" | "Rejected";
export type ClaimSource = "Receipt" | "Manual" | "Auto";

export interface Claim {
  id: string;
  user: string;
  initials: string;
  firm: string;
  plan: string;
  amount: number;
  submitted: string;
  source: ClaimSource;
  status: ClaimStatus;
  order: string;
}

export const CLAIMS: Claim[] = [
  { id: "CLM-2211", user: "Ava Mehta", initials: "AM", firm: "FundingPips", plan: "$10K Two-Step", amount: 19.6, submitted: "12 min ago", source: "Receipt", status: "Pending", order: "FP-99120" },
  { id: "CLM-2210", user: "Dev Kapoor", initials: "DK", firm: "FTMO", plan: "$25K Swing", amount: 34.9, submitted: "48 min ago", source: "Manual", status: "Pending", order: "FT-8842190" },
  { id: "CLM-2209", user: "Sara Rahman", initials: "SR", firm: "The5ers", plan: "$20K Hyper", amount: 24.0, submitted: "2 h ago", source: "Auto", status: "Pending", order: "T5-41022" },
  { id: "CLM-2208", user: "Noah Berg", initials: "NB", firm: "Alpha Capital", plan: "$50K One-Step", amount: 41.25, submitted: "5 h ago", source: "Receipt", status: "Approved", order: "AC-77341" },
  { id: "CLM-2207", user: "Priya Nair", initials: "PN", firm: "FundedNext", plan: "$15K Stellar", amount: 11.4, submitted: "Yesterday", source: "Auto", status: "Approved", order: "FN-20551" },
  { id: "CLM-2206", user: "Omar Faruk", initials: "OF", firm: "Goat Funded", plan: "$5K Two-Step", amount: 4.5, submitted: "Yesterday", source: "Manual", status: "Rejected", order: "GF-11902" },
];

export const REJECT_REASONS = [
  "Coupon not applied at checkout",
  "Order not found in the firm's report",
  "Duplicate of an existing claim",
  "Order refunded",
];
