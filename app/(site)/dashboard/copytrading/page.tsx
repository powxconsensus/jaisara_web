import type { Metadata } from "next";
import Link from "next/link";
import { WaitlistForm } from "@/components/dashboard/waitlist-form";

export const metadata: Metadata = { title: "Copytrading" };

/**
 * Copytrading — announced, not built.
 *
 * This page used to end in two grey cards captioned PLACEHOLDER, over a striped
 * rectangle standing in for a chart. That is a screenshot of unfinished work,
 * not a product page: it tells a member nothing and makes the whole dashboard
 * look half-done.
 *
 * So it says what is actually known — what the feature is, how it will work
 * with the wallet they already have, and what is deliberately not decided yet —
 * and gives them one real button. Nothing here is fabricated: no invented
 * trader names, no example returns, no launch date we cannot commit to.
 */
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

      <WaitlistForm feature="copytrading" />

      <div className="mb-6 rounded-card border border-hair bg-surface p-[clamp(18px,3vw,26px)]">
        <p className="mb-4 font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
          How it will work
        </p>
        <ol className="space-y-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3.5">
              <span className="mt-0.5 grid size-6 flex-none place-items-center rounded-lg bg-surface-2 font-mono text-[10px] text-primary">
                {index + 1}
              </span>
              <div>
                <p className="text-[13.5px] font-semibold">{step.title}</p>
                <p className="mt-1 text-[13px] leading-[1.65] text-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-card border border-hair bg-surface p-[clamp(18px,3vw,26px)]">
        <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
          Still being decided
        </p>
        <p className="mb-4 text-[13px] leading-[1.65] text-muted">
          Two things are genuinely open, and we would rather say so than publish a number we change
          later: what a trader takes as a performance fee, and how much of your own account a single
          copied trader can move. If you have a view, the assistant will pass it on.
        </p>
        <p className="text-[13px] leading-[1.65] text-muted">
          In the meantime, cashback is the part that already works —{" "}
          <Link href="/deals" className="text-primary underline underline-offset-2">
            browse the firms we track
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

const STEPS = [
  {
    title: "Only accounts that actually passed",
    body: "A trader is listed once they hold a funded account we can verify, not on a screenshot of a demo. The track record shown is the funded one.",
  },
  {
    title: "You copy from your own funded account",
    body: "Trades mirror into an account you own at the firm you chose. Jaisara never holds your trading capital — the same reason we pay cashback to your wallet rather than crediting it at the firm.",
  },
  {
    title: "One wallet, both ways to earn",
    body: "Cashback and anything you make from copying land in the wallet you already have, withdraw the same way, and count towards the same club tier.",
  },
];
