import type { Metadata } from "next";
import { WalletView } from "@/components/dashboard/wallet-view";

export const metadata: Metadata = { title: "Wallet" };

/**
 * The wallet (handoff §4.5): balance card, submit-a-claim CTA and the recent
 * cashback ledger. Every figure comes from the member's own account.
 */
export default function WalletPage() {
  return <WalletView />;
}
