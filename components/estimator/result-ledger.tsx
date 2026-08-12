import Link from "next/link";
import { money } from "@/lib/format";
import type { EstimatorFirm, EstimatorSize } from "@/lib/data/estimator";
import { estimate } from "@/lib/data/estimator";

/** One ledger row with a dotted leader. */
function Row({
  label,
  value,
  tone,
  emphasis,
}: {
  label: string;
  value: string;
  tone?: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline gap-2 py-1.5 ${tone ?? ""} ${emphasis ? "font-semibold" : ""}`}
    >
      <span className="flex-none tracking-[0.06em]">{label}</span>
      <span
        aria-hidden="true"
        className="flex-1 border-b border-dotted"
        style={{ borderColor: "color-mix(in oklab, var(--text) 24%, transparent)" }}
      />
      <span className="flex-none whitespace-nowrap tabular-nums">{value}</span>
    </div>
  );
}

/**
 * The estimate, printed as a receipt (handoff §5). The line order is fixed:
 * the cashback line must be visible, and YOU PAY AT CHECKOUT must be the real
 * amount charged - the plain-language sentence underneath restates both.
 */
export function ResultLedger({
  firm,
  product,
  tierIndex,
  onEdit,
}: {
  firm: EstimatorFirm | null;
  product: EstimatorSize | null;
  tierIndex: number;
  /** Shown on the wizard once the config has collapsed. */
  onEdit?: () => void;
}) {
  const ready = firm !== null && product !== null;
  const result = ready ? estimate({ firm, product, tierIndex }) : null;
  const dash = "$ -";

  return (
    <div
      className="relative flex w-full flex-col self-start overflow-hidden rounded-card bg-surface p-[clamp(22px,3vw,30px)] lg:sticky lg:top-[110px]"
      style={{ borderWidth: 1, borderColor: "color-mix(in oklab, var(--primary) 32%, var(--hair))" }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-[30%] -top-[40%] size-[340px] rounded-full bg-primary opacity-[0.14] blur-[90px]"
      />

      <div className="relative mb-[22px] flex items-center justify-between gap-3">
        <span className="font-mono text-[9.5px] tracking-[0.22em] text-primary">YOUR ESTIMATE</span>
        <span className="font-mono text-[9.5px] tracking-[0.14em] text-muted">
          {ready ? firm.name.toUpperCase() : "SETUP"}
        </span>
      </div>

      <div className="relative">
        <p className="mb-2.5 font-mono text-[10px] tracking-[0.12em] text-muted">
          CASHBACK ON THIS CHALLENGE
        </p>
        <div className="flex items-baseline gap-3">
          {/* Announced on change, and tabular so it never jitters. */}
          <p
            aria-live="polite"
            data-count
            className="font-mono text-[clamp(40px,5.4vw,54px)] font-medium leading-none tracking-[-0.05em] text-primary"
          >
            {result ? money(result.cashback) : "$--.--"}
          </p>
          <p className="font-mono text-[13px] text-muted">
            {ready ? `${product.cashbackPct}% of price` : "pick firm, challenge, size"}
          </p>
        </div>
      </div>

      {/* Perforation - notches sit outside the padding, hence the offsets. */}
      <div className="relative my-5" aria-hidden="true">
        <div
          className="border-t-2 border-dashed"
          style={{ borderColor: "color-mix(in oklab, var(--text) 16%, transparent)" }}
        />
        <span className="absolute -top-[9px] left-[-32px] size-[18px] rounded-full bg-bg" />
        <span className="absolute -top-[9px] right-[-32px] size-[18px] rounded-full bg-bg" />
      </div>

      <div className="relative flex flex-col font-mono text-xs">
        <Row label="CHALLENGE PRICE" value={result ? money(result.price) : dash} />
        <Row
          label="COUPON DISCOUNT"
          value={result ? `−${money(result.discount)}` : dash}
          tone="text-success"
        />
        <Row
          label="YOU PAY AT CHECKOUT"
          value={result ? money(result.youPay) : dash}
          emphasis
        />
        <Row
          label="CASHBACK BACK TO YOU"
          value={result ? `−${money(result.baseCashback)}` : dash}
          tone="text-primary"
        />
        <Row
          label="CLUB BONUS"
          value={result ? `+${money(result.clubBonus)}` : dash}
          tone="text-club"
        />
        <div className="pt-2 text-[13.5px]">
          <Row label="EFFECTIVE COST" value={result ? money(result.effectiveCost) : dash} emphasis />
        </div>

        <p className="mt-3 font-sans text-[11.5px] leading-[1.6] tracking-normal text-muted">
          {result
            ? `You pay ${money(result.youPay)} today. ${money(result.cashback)} becomes available after the firm’s applicable refund window closes.`
            : "The ledger prints itself as you choose. Nothing here is charged by Jaisara - you buy from the firm directly."}
        </p>
      </div>

      <div className="flex-1" />

      <div className="relative mt-4 flex flex-col gap-[9px]">
        <Link
          href={ready ? `/firm/${firm.slug}` : "/deals"}
          aria-disabled={!ready}
          className="rounded-[11px] px-4 py-[15px] text-center font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] transition hover:-translate-y-0.5 hover:brightness-[1.08]"
          style={
            ready
              ? { background: "var(--primary)", color: "var(--on-primary)" }
              : { background: "var(--surface-2)", color: "var(--text-muted)" }
          }
        >
          {ready ? "Get this deal" : "Select a firm to start"}
        </Link>
        <p className="text-center text-[11px] leading-[1.5] text-muted">
          {ready
            ? "Excludes resets and add-ons. Refunds reverse the cashback."
            : "The estimate prints here as you make each choice."}
        </p>
        <Link
          href="/terms"
          className="text-center font-mono text-[9px] uppercase tracking-[0.12em] text-muted underline decoration-hair underline-offset-4 transition hover:text-fg"
        >
          Reward terms
        </Link>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="mt-0.5 flex cursor-pointer justify-center rounded-[11px] border border-hair p-[13px] font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted"
          >
            ← Change firm or size
          </button>
        )}
      </div>
    </div>
  );
}
