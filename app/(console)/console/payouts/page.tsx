import type { Metadata } from "next";
import { PayoutQueue } from "@/components/console/payouts/payout-queue";

export const metadata: Metadata = { title: "Payouts" };

export default function ConsolePayoutsPage() {
  return <PayoutQueue />;
}
