import Link from "next/link";
import { FirmMark } from "@/components/ui/firm-mark";
import { Reveal } from "@/components/ui/reveal";
import type { Firm } from "@/lib/data/firms";

/**
 * Paid relationships are labelled plainly. The section does not render until
 * an admin selects at least one active firm, so an empty configuration never
 * turns an ordinary catalogue relationship into a sponsorship claim.
 */
export function SponsoredFirms({ firms }: { firms: Firm[] }) {
  if (firms.length === 0) return null;

  return (
    <Reveal className="mx-auto max-w-[var(--maxw)] px-[var(--pad)] pt-[clamp(38px,5vw,66px)]">
      <div className="overflow-hidden rounded-card border border-hair bg-surface">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-hair px-[clamp(18px,3vw,30px)] py-4">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-club">
              Sponsored partners
            </p>
            <h2 className="mt-2 font-display text-[clamp(20px,2.8vw,31px)] font-black uppercase leading-none tracking-[-0.02em]">
              Firms supporting Jaisara
            </h2>
          </div>
          <p className="max-w-[40ch] text-[12px] leading-5 text-muted">
            Paid partnerships are always marked. Offer details still follow the same verification rules.
          </p>
        </div>

        <div className="grid gap-px bg-hair md:grid-cols-2 lg:grid-cols-3">
          {firms.map((firm) => (
            <Link
              key={firm.slug}
              href={`/firm/${firm.slug}`}
              className="group flex items-center gap-3.5 bg-bg px-[clamp(18px,3vw,28px)] py-5 transition hover:bg-surface-2"
            >
              <FirmMark
                name={firm.name}
                mark={firm.mark}
                logoUrl={firm.logoUrl}
                size={44}
                className="rounded-[12px]"
              />
              <span className="min-w-0 flex-1">
                <strong className="block truncate font-display text-[15px] font-bold uppercase tracking-[-0.01em]">
                  {firm.name}
                </strong>
                <span className="mt-1 block font-mono text-[9px] tracking-[0.14em] text-muted">
                  VIEW OFFER
                </span>
              </span>
              <span aria-hidden className="text-muted transition group-hover:translate-x-1 group-hover:text-primary">
                ↗
              </span>
            </Link>
          ))}
        </div>
      </div>
    </Reveal>
  );
}
