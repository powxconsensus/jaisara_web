import type { Metadata } from "next";
import { DealsIndex } from "@/components/deals/deals-index";

export const metadata: Metadata = {
  title: "Deals index",
  description: "Every prop firm we index, with the cashback rate and coupon discount for each.",
};

export default function DealsPage() {
  return <DealsIndex />;
}
