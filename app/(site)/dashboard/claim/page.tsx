import type { Metadata } from "next";
import { ClaimTabs } from "@/components/claim/claim-tabs";

export const metadata: Metadata = { title: "Submit a claim" };

export default function ClaimPage() {
  return (
    <div className="max-w-[660px]">
      <p className="mb-3.5 font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
        [ New claim ]
      </p>
      <h1 className="mb-3 font-display text-[clamp(25px,3.3vw,34px)] font-black uppercase leading-none tracking-[-0.02em]">
        Claim your cashback
      </h1>
      <p className="mb-6 text-[14.5px] leading-[1.65] text-muted">
        Let us fetch it automatically, drop the receipt and we&rsquo;ll read it, or type the details
        yourself.
      </p>
      <ClaimTabs />
    </div>
  );
}
