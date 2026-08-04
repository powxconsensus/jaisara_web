import type { Metadata } from "next";
import { WithdrawForm } from "@/components/withdraw/withdraw-form";

export const metadata: Metadata = { title: "Withdraw" };

export default function WithdrawPage() {
  return (
    <div className="max-w-[620px]">
      <p className="mb-3.5 font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
        [ Withdraw ]
      </p>
      <h1 className="mb-7 font-display text-[clamp(25px,3.3vw,34px)] font-black uppercase leading-none tracking-[-0.02em]">
        Cash out
      </h1>
      <WithdrawForm />
    </div>
  );
}
