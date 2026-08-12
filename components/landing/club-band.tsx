import Link from "next/link";
import { Reveal } from "@/components/ui/reveal";

/**
 * Worked examples of a Club payout - invented numbers, not member activity.
 *
 * The code always said "illustrative"; the page did not. Two named people with
 * exact amounts read as real earnings to anybody looking at it, which is a
 * claim we cannot support. The panel is now labelled, so it reads as the
 * arithmetic it is.
 */
const EXAMPLES = [
  { mark: "AV", name: "Ava referred 3 traders", amount: "+$41.20" },
  { mark: "DK", name: "Dev referred 11 traders", amount: "+$168.90" },
];

/**
 * The referral layer, in gold.
 *
 * Club copy makes the member benefit and non-deduction rule explicit.
 */
export function ClubBand() {
  return (
    <Reveal className="mx-auto max-w-[var(--maxw)] px-[var(--pad)] pb-[var(--secpb2)]">
      <div
        className="relative grid items-center gap-[clamp(20px,4vw,34px)] overflow-hidden rounded-[20px] border p-[clamp(28px,4vw,50px)] lg:grid-cols-2"
        style={{
          borderColor: "color-mix(in oklab, var(--club) 32%, var(--hair))",
          background:
            "linear-gradient(120deg, color-mix(in oklab, var(--club) 10%, var(--surface)), var(--surface) 62%)",
        }}
      >
        <div>
          <p className="mb-[18px] font-mono text-[10px] uppercase tracking-[0.24em] text-club">
            Jaisara Club
          </p>
          <h2 className="mb-4 font-display text-[clamp(26px,3.4vw,40px)] font-black uppercase leading-none tracking-[-0.025em]">
            Invite once.
            <br />
            Earn{" "}
            <span className="font-serif font-normal normal-case italic tracking-normal text-club">
              forever
            </span>
            .
          </h2>
          <p className="mb-[26px] max-w-[44ch] text-[15px] leading-[1.65] text-muted">
            Earn a separate Club reward when people you invite receive eligible cashback. Their
            advertised cashback is never reduced.
          </p>
          <Link
            href="/dashboard/club"
            className="inline-flex items-center gap-2.5 rounded-[11px] bg-club px-6 py-3.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.15em] transition hover:-translate-y-0.5 hover:brightness-105"
            style={{ color: "#20160A" }}
          >
            See the Club<span className="text-[13px]">↗</span>
          </Link>
        </div>

        <div className="flex flex-col gap-2.5">
          <p className="font-mono text-[9px] tracking-[0.18em] text-muted">
            [ EXAMPLE: HOW A CLUB REWARD ADDS UP ]
          </p>
          {EXAMPLES.map((example) => (
            <div
              key={example.mark}
              className="flex items-center gap-3.5 rounded-[12px] border border-hair px-[18px] py-4"
              style={{ background: "color-mix(in oklab, var(--bg) 80%, transparent)" }}
            >
              <span
                className="grid size-8 place-items-center rounded-[9px] font-mono text-[10px] text-club"
                style={{ background: "color-mix(in oklab, var(--club) 18%, var(--surface))" }}
              >
                {example.mark}
              </span>
              <div className="flex-1">
                <p className="text-[13.5px] font-medium">{example.name}</p>
                <p className="mt-[3px] font-mono text-[10px] tracking-[0.08em] text-muted">
                  LAST MONTH
                </p>
              </div>
              <span data-count className="font-mono text-[13.5px] text-club">
                {example.amount}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  );
}
