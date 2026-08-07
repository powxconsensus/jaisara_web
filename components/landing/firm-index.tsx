import Link from "next/link";
import type { Firm } from "@/lib/data/firms";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";

/**
 * [02] THE INDEX — the top firms this week.
 *
 * Sorted by cashback descending, and the rank number is the position in that
 * ordering, so the two can never disagree (handoff §4.1).
 */
export function FirmIndex({ firms = [] }: { firms?: Firm[] }) {
  // Best rate first — the index is a comparison, so the strongest offer leads.
  const top = [...firms].sort((a, b) => b.cashback - a.cashback).slice(0, 5);

  return (
    <Reveal className="mx-auto max-w-[var(--maxw)] px-[var(--pad)] pb-[var(--secpb)] pt-[var(--secpt)]">
      <div className="mb-2 flex items-end justify-between gap-5">
        <SectionHeading index="02" eyebrow="The index">
          Highest rates
          <br />
          this week
        </SectionHeading>
        <Link
          href="/deals"
          className="flex-none pb-1.5 font-mono text-[10.5px] tracking-[0.15em] text-muted transition-colors hover:text-fg"
        >
          VIEW ALL {firms.length} ↗
        </Link>
      </div>

      <div className="mt-[26px]">
        {top.map((firm, i) => (
          <Link
            key={firm.slug}
            href={`/firm/${firm.slug}`}
            className="flex items-center gap-[clamp(14px,2.5vw,30px)] border-t border-hair-soft px-2.5 py-[clamp(16px,2.5vw,24px)] text-fg transition duration-[250ms] ease-[cubic-bezier(.2,.8,.2,1)] hover:translate-x-2 hover:bg-[color-mix(in_oklab,var(--surface)_70%,transparent)]"
          >
            <span className="w-[26px] flex-none font-mono text-[11px] text-muted">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="min-w-0 flex-1 truncate font-display text-[17px] font-black uppercase leading-none tracking-[-0.02em] md:text-[clamp(19px,2.8vw,30px)]">
              {firm.name}
            </span>
            <span className="hidden flex-none font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted lg:inline">
              {firm.kind}
            </span>
            <span className="hidden flex-none font-mono text-[11px] tracking-[0.08em] text-muted lg:inline">
              {firm.coupon}
            </span>
            {/* Labelled, never a bare percentage. */}
            <span className="flex-none text-right font-mono tabular-nums tracking-[-0.02em] text-primary">
              <span className="text-[19px] md:text-[clamp(20px,2.6vw,28px)]">
                {firm.cashback}%
              </span>
              <span className="ml-1.5 font-mono text-[9px] tracking-[0.12em] text-muted">
                cashback
              </span>
            </span>
            <span className="hidden size-[34px] flex-none place-items-center rounded-[10px] border border-hair text-sm text-muted md:grid">
              ↗
            </span>
          </Link>
        ))}
        <div className="border-t border-hair-soft" />
      </div>
    </Reveal>
  );
}
