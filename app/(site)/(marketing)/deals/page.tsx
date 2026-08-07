import type { Metadata } from "next";
import { DealsIndex } from "@/components/deals/deals-index";
import { fetchFirms } from "@/lib/data/deals";

export const metadata: Metadata = {
  title: "Deals index",
  description: "Every prop firm we index, with the cashback rate and coupon discount for each.",
};

export default async function DealsPage() {
  const firms = await fetchFirms();
  return <DealsIndex firms={firms} />;
}
