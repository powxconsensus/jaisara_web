import Link from "next/link";
import type { Firm } from "@/lib/data/firms";
import { cn } from "@/lib/cn";

/**
 * One row of the deals index.
 *
 * Both figures are labelled — `14% cashback`, `20% off` — never a bare
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
    <div className="group relative grid grid-cols-[24px_minmax(0,1fr)_62px] items-center gap-x-[clamp(12px,2.2vw,30px)] gap-y-1.5 border-t border-hair-soft px-2.5 py-[13px] transition duration-[250ms] ease-[cubic-bezier(.2,.8,.2,1)] hover:translate-x-2 hover:bg-[color-mix(in_oklab,var(--surface)_70%,transparent)] md:grid-cols-[26px_minmax(0,1fr)_96px_34px] md:py-[clamp(15px,2.5vw,22px)] lg:grid-cols-[26px_40px_minmax(0,1fr)_104px_96px_96px_34px]">
      {/* The whole row is a link; the compare button sits above it. */}
      <Link
        href={`/firm/${firm.slug}`}
        className="absolute inset-0 z-0"
        aria-label={`${firm.name} — ${firm.cashback}% cashback, ${firm.discount}% off`}
      />

      <span className="pointer-events-none z-10 font-mono text-[11px] text-muted">
        {String(rank).padStart(2, "0")}
      </span>

      <span className="pointer-events-none z-10 hidden size-10 items-center justify-center rounded-[11px] bg-surface-2 font-mono text-[11px] text-muted lg:flex">
        {firm.mark}
      </span>

      <div className="pointer-events-none z-10 col-start-2 min-w-0 md:col-start-auto">
        <p className="truncate font-display text-[17px] font-black uppercase leading-[1.02] tracking-[-0.02em] md:text-[clamp(19px,2.8vw,30px)]">
          {firm.name}
        </p>
        <p
          className={cn(
            "mt-0.5 truncate font-mono text-[8.5px] uppercase leading-[1.5] tracking-[0.12em]",
            firm.tag ? "text-primary" : "text-muted",
          )}
        >
          {firm.tag ? `${firm.tag} · ` : ""}
          {firm.discount}% off · {firm.split} split
        </p>
      </div>

      <span className="pointer-events-none z-10 hidden font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted lg:inline">
        {firm.kind}
      </span>

      <span className="pointer-events-none z-10 hidden font-mono text-[11px] tracking-[0.08em] lg:inline">
        {firm.coupon}
      </span>

      <div className="pointer-events-none z-10 self-center text-right">
        <p className="font-mono text-[19px] leading-none tabular-nums tracking-[-0.02em] text-primary md:text-[clamp(20px,2.6vw,27px)]">
          {firm.cashback}%
        </p>
        <p className="mt-[5px] whitespace-nowrap font-mono text-[8.5px] tracking-[0.12em] text-muted">
          cashback
        </p>
      </div>

      <button
        type="button"
        onClick={onToggleCompare}
        aria-pressed={comparing}
        title={comparing ? `Remove ${firm.name} from compare` : `Compare ${firm.name}`}
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
