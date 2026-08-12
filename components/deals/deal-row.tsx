import Link from "next/link";
import type { Firm } from "@/lib/data/firms";
import { FirmMark } from "@/components/ui/firm-mark";
import { cn } from "@/lib/cn";

/**
 * One row of the deals index.
 *
 * Both figures are labelled - `14% cashback`, `20% off` - never a bare
 * percentage (handoff §4.2). On phones the row collapses to three columns
 * (rank / name+meta / cashback); the type and coupon columns drop, and the
 * compare toggle overlays the rank cell.
 */
export function DealRow({
  firm,
  rank,
  comparing,
  onToggleCompare,
}: {
  firm: Firm;
  rank: number;
  comparing: boolean;
  onToggleCompare: () => void;
}) {
  return (
    <div className="group relative grid grid-cols-[24px_minmax(0,1fr)_62px] items-center gap-x-[clamp(12px,2.2vw,30px)] gap-y-1.5 border-b border-hair-soft px-4 py-[15px] transition duration-[250ms] ease-[cubic-bezier(.2,.8,.2,1)] last:border-b-0 hover:bg-[linear-gradient(90deg,color-mix(in_oklab,var(--primary)_8%,transparent),color-mix(in_oklab,var(--surface)_72%,transparent))] md:grid-cols-[26px_minmax(0,1fr)_96px_34px] md:px-5 md:py-[clamp(18px,2.5vw,25px)] lg:grid-cols-[26px_40px_minmax(0,1fr)_104px_96px_96px_34px]">
      {/* The whole row is a link; the compare button sits above it. */}
      <Link
        href={`/firm/${firm.slug}`}
        className="absolute inset-0 z-0"
        aria-label={
          firm.cashback > 0
            ? `${firm.name} - ${firm.cashback}% cashback, ${firm.discount}% off`
            : `${firm.name} - cashback rate coming, ${firm.discount}% off`
        }
      />

      <span className="pointer-events-none z-10 font-mono text-[11px] text-muted">
        {String(rank).padStart(2, "0")}
      </span>

      <span className="pointer-events-none z-10 hidden transition-transform duration-300 group-hover:scale-105 lg:block">
        <FirmMark
          name={firm.name}
          mark={firm.mark}
          logoUrl={firm.logoUrl}
          size={40}
          className="rounded-[11px]"
        />
      </span>

      <div className="pointer-events-none z-10 col-start-2 min-w-0 md:col-start-auto">
        <p className="truncate font-display text-[17px] font-black uppercase leading-[1.02] tracking-[-0.02em] md:text-[clamp(19px,2.8vw,30px)]">
          {firm.name}
        </p>
        {/* Only facts we have. A firm with no coupon discount and no recorded
            profit split used to render "0% OFF · - SPLIT", which states two
            things that are not true rather than saying nothing. */}
        <p
          className={cn(
            "mt-0.5 truncate font-mono text-[8.5px] uppercase leading-[1.5] tracking-[0.12em]",
            firm.tag ? "text-primary" : "text-muted",
          )}
        >
          {[
            firm.tag,
            firm.discount > 0 ? `${firm.discount}% off` : null,
            firm.split && firm.split !== "-" ? `${firm.split} split` : null,
            firm.payout,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      <span className="pointer-events-none z-10 hidden font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted lg:inline">
        {firm.kind}
      </span>

      <span className="pointer-events-none z-10 hidden font-mono text-[11px] tracking-[0.08em] lg:inline">
        {firm.coupon}
      </span>

      <div className="pointer-events-none z-10 self-center text-right">
        {/* Never a zero: a firm whose cashback rate has not been published has
            no rate to show, and "0% cashback" reads as an offer rather than as
            missing data. */}
        {firm.cashback > 0 ? (
          <>
            <p className="font-mono text-[19px] leading-none tabular-nums tracking-[-0.02em] text-primary md:text-[clamp(20px,2.6vw,27px)]">
              {firm.cashback}%
            </p>
            <p className="mt-[5px] whitespace-nowrap font-mono text-[8.5px] tracking-[0.12em] text-muted">
              cashback
            </p>
          </>
        ) : (
          <p className="whitespace-nowrap font-mono text-[8.5px] tracking-[0.12em] text-muted">
            RATE COMING
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onToggleCompare}
        aria-pressed={comparing}
        title={
          comparing
            ? `Remove ${firm.name} from compare`
            : `Compare ${firm.name}`
        }
        className={cn(
          "z-10 col-start-1 row-start-1 grid size-[34px] cursor-pointer place-items-center justify-self-end rounded-[10px] border text-[15px] transition-all duration-[180ms] md:col-start-auto md:row-start-auto",
          comparing
            ? "border-primary bg-[color-mix(in_oklab,var(--primary)_16%,transparent)] text-primary"
            : "border-hair text-muted hover:border-primary",
        )}
      >
        {comparing ? "−" : "+"}
      </button>
    </div>
  );
}
