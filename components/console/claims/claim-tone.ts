import type { Tone } from "@/components/console/ui";
import type { ClaimStatus } from "@/lib/admin-types";

/**
 * Status → tone.
 *
 * `MATCHED` is the warning colour on purpose: it is the only status that means
 * a human still has to do something. Approved and rejected are both settled,
 * whatever the outcome was.
 */
export const CLAIM_TONE: Record<ClaimStatus, Tone> = {
  DRAFT: "neutral",
  AWAITING_REPORT: "info",
  MATCHED: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  DUPLICATE: "danger",
  DISPUTED: "warning",
};
