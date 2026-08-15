import type { Metadata } from "next";
import { ClaimsView } from "@/components/dashboard/claims-view";

export const metadata: Metadata = { title: "Your claims" };

/**
 * Claims only, deliberately.
 *
 * Once purchases are matched automatically this becomes the full order history
 * - every purchase, claimed or not. Until then it shows what the member
 * actually did, because a page that listed purchases they never told us about
 * would be showing them what we know about them before they asked.
 */
export default function ClaimsPage() {
  return (
    <div className="max-w-[860px]">
      <ClaimsView />
    </div>
  );
}
