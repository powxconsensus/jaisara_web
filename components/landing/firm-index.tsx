import Link from "next/link";
import type { Firm } from "@/lib/data/firms";
import { FirmMark } from "@/components/ui/firm-mark";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { money } from "@/lib/format";

/**
 * The top firms this week.
 *
 * Sorted by cashback descending. The row leads with the firm's logo rather
 * than a rank number: the number was only ever the position in this sort, so
 * it told you nothing the order did not, and it cost the one slot on the row
 * where a reader is actually looking for the brand.
 */
export function FirmIndex({ firms = [] }: { firms?: Firm[] }) {
  // Best rate first - the index is a comparison, so the strongest offer leads.
  // A firm with no published rate cannot lead a "highest rates" list, so it
  // sorts last rather than claiming a rate of zero.
  const top = [...firms].sort((a, b) => b.cashback - a.cashback).slice(0, 5);

  return (
    <Reveal className="mx-auto max-w-[var(--maxw)] px-[var(--pad)] pb-[var(--secpb)] pt-[var(--secpt)]">
      <div className="mb-2 flex items-end justify-between gap-5">
        <SectionHeading eyebrow="Top cashback">
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
        {top.map((firm) => (
          <Link
            key={firm.slug}
            href={`/firm/${firm.slug}`}
            className="flex items-center gap-[clamp(12px,2.2vw,26px)] border-t border-hair-soft px-2.5 py-[clamp(16px,2.5vw,24px)] text-fg transition duration-[250ms] ease-[cubic-bezier(.2,.8,.2,1)] hover:translate-x-2 hover:bg-[color-mix(in_oklab,var(--surface)_70%,transparent)]"
          >
            <FirmMark
              name={firm.name}
              mark={firm.mark}
              logoUrl={firm.logoUrl}
              size={40}
              className="rounded-[11px]"
            />
            <span className="min-w-0 flex-1 truncate font-display text-[17px] font-black uppercase leading-none tracking-[-0.02em] md:text-[clamp(19px,2.8vw,30px)]">
              {firm.name}
            </span>
            {/* What the firm sells, in the space the bare type descriptor
                used to occupy. "Evaluation" is a category; "6 challenges from
                $149" is a reason to click. Falls back to the descriptor for a
                firm whose catalogue is not filled in yet. */}
            <span className="hidden flex-none font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted lg:inline">
              {firm.challenges?.length
                ? `${firm.challenges.length} from ${money(firm.challenges[0].price)}`
                : firm.kind}
            </span>
            <span className="hidden flex-none font-mono text-[11px] tracking-[0.08em] text-muted lg:inline">
              {firm.coupon}
            </span>
            {/* Labelled, never a bare percentage - and never a zero. A firm
                whose cashback rate has not been published has no rate to show;
                printing "0% cashback" reads as an offer of nothing rather than
                as missing data, and it is the one number here nobody should
                ever see wrong. */}
            {firm.cashback > 0 ? (
              <span className="flex-none text-right font-mono tabular-nums tracking-[-0.02em] text-primary">
                <span className="text-[19px] md:text-[clamp(20px,2.6vw,28px)]">
                  {firm.cashback}%
                </span>
                <span className="ml-1.5 font-mono text-[9px] tracking-[0.12em] text-muted">
                  cashback
                </span>
              </span>
            ) : (
              <span className="flex-none text-right font-mono text-[9px] tracking-[0.12em] text-muted">
                RATE COMING
              </span>
            )}
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
