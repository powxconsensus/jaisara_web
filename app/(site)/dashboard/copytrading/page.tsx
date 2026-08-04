import type { Metadata } from "next";
import { WaitlistForm } from "@/components/dashboard/waitlist-form";

export const metadata: Metadata = { title: "Copytrading" };

const PLACEHOLDERS = [
  { mark: "MK", note: "Verified track record, risk profile, copy button." },
  { mark: "SR", note: "Allocation, drawdown cap, performance fee." },
];

/** Phase 4 teaser — kept behind a SOON tag in the nav. */
export default function CopytradingPage() {
  return (
    <div className="max-w-[720px]">
      <p className="mb-3.5 font-mono text-[10px] uppercase tracking-[0.24em] text-club">
        [ Coming soon ]
      </p>
      <h1 className="mb-3.5 font-display text-[clamp(28px,4vw,44px)] font-black uppercase leading-[0.98] tracking-[-0.025em]">
        Copy the traders who{" "}
        <span className="font-serif font-normal normal-case italic tracking-normal text-primary">
          actually pass.
        </span>
      </h1>
      <p className="mb-7 max-w-[52ch] text-[15px] leading-[1.68] text-muted">
        Follow verified funded accounts from inside Jaisara. Same wallet, same cashback, one more
        way to earn.
      </p>

      <WaitlistForm />

      <div className="grid gap-[13px] md:grid-cols-2">
        {PLACEHOLDERS.map((card) => (
          <div
            key={card.mark}
            className="rounded-card border border-hair bg-surface p-[22px] opacity-60"
          >
            <div className="mb-5 flex items-center gap-3">
              <span className="grid size-[34px] place-items-center rounded-[10px] bg-surface-2 font-mono text-[10px] text-muted">
                {card.mark}
              </span>
              <div>
                <p className="text-sm font-semibold">Trader profile</p>
                <p className="mt-[3px] font-mono text-[9px] tracking-[0.1em] text-muted">
                  PLACEHOLDER
                </p>
              </div>
            </div>
            <div
              className="h-[52px] rounded-[9px]"
              style={{
                background:
                  "repeating-linear-gradient(135deg, var(--surface-2) 0 10px, var(--surface) 10px 20px)",
              }}
            />
            <p className="mt-4 text-xs text-muted">{card.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
