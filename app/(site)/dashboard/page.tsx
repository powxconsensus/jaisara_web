import type { Metadata } from "next";
import { WalletView } from "@/components/dashboard/wallet-view";
import { fetchPublicSettings } from "@/lib/data/settings";

export const metadata: Metadata = { title: "Wallet" };

/**
 * The wallet (handoff §4.5): balance card, submit-a-claim CTA and the recent
 * cashback ledger. Every figure comes from the member's own account.
 *
 * The points rate is read on the server so the balance and the points beneath
 * it appear together. Fetched from the client they would arrive separately, and
 * a figure that changes shape after paint is exactly what somebody reads twice.
 */
export default async function WalletPage() {
  const { pointsPerUsd } = await fetchPublicSettings();
  return <WalletView pointsPerUsd={pointsPerUsd} />;
}
