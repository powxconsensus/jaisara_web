import Link from "next/link";
import type { Ref } from "react";
import { money, percent } from "@/lib/format";
import { RECEIPT_STATUS, receiptTotals, type Receipt } from "@/lib/data/receipts";
import { Perforation } from "./perforation";

/** One itemised line with a dotted leader between label and figure. */
function Line({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "muted";
}) {
  const toneClass = tone === "success" ? "text-success" : tone === "muted" ? "text-muted" : "";
  return (
    <div className={`flex items-baseline gap-2 py-3.5 ${toneClass}`}>
      <span className="flex-none">{label}</span>
      {/* A real border, not letter-spaced dots - it stretches to fill. */}
      <span
        aria-hidden="true"
        className="flex-1 border-b border-dotted"
        style={{ borderColor: "color-mix(in oklab, var(--text) 24%, transparent)" }}
      />
      <span className="flex-none tabular-nums">{value}</span>
    </div>
  );
}

/**
 * The live receipt. Presentational: it renders whichever receipt it is given
 * and owns no animation state - `ReceiptDeck` drives the motion.
 */
export function ReceiptCard({
  receipt,
  cardRef,
  stampRef,
  masked = false,
}: {
  receipt: Receipt;
  cardRef?: Ref<HTMLDivElement>;
  stampRef?: Ref<HTMLDivElement>;
  /** Empty-feed presentation: keep the receipt, conceal every ledger value. */
  masked?: boolean;
}) {
  const status = masked
    ? {
        stamp: "WAITING",
        color: "var(--text-muted)",
        who: "VERIFIED ACTIVITY ONLY",
        footer: "REAL LEDGER ACTIVITY WILL APPEAR HERE",
        dot: "var(--text-muted)",
      }
    : RECEIPT_STATUS[receipt.status];
  const { discount, youPay, cashback } = receiptTotals(receipt);

  return (
    <div
      ref={cardRef}
      /* The resting state IS this static style. Motion never persists
         transform/opacity here - see receipt-motion.ts.

         `leading-[normal]` is deliberate: Tailwind's preflight puts 1.5 on
         <html>, which inflates every mono row and made the sheet 22px shorter
         than the design. The card's height sets where the fracture lands on
         the ground, so this is geometry, not typography. */
      className="relative overflow-hidden rounded-receipt border border-hair bg-surface leading-[normal] [transform-origin:8%_100%]"
      style={{
        boxShadow:
          "0 50px 100px -55px rgba(0,0,0,.8), 0 0 0 1px color-mix(in oklab, var(--primary) 12%, transparent)",
      }}
    >
      {/* Corner light */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-receipt"
        style={{
          background:
            "linear-gradient(150deg, color-mix(in oklab, var(--primary) 7%, transparent), transparent 42%)",
        }}
      />
      {/* Top edge highlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[14%] right-[14%] top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, color-mix(in oklab, var(--primary) 70%, transparent), transparent)",
        }}
      />
      {/* Sheen sweep */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 top-0 w-[38%] motion-safe:[animation:jsSheen_6.5s_1.2s_ease-in-out_infinite]"
        style={{
          background:
            "linear-gradient(100deg, transparent, color-mix(in oklab, var(--text) 5%, transparent), transparent)",
        }}
      />

      <div className="relative">
        <header className="px-[var(--rcpt-pad)] pb-1.5 pt-[var(--rcpt-pad)]">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-mono text-[10px] tracking-[0.2em]">JAISARA</span>
            <span className="font-mono text-[9px] tracking-[0.1em] text-muted">
              {masked ? "#•••••••" : receipt.id}
            </span>
          </div>
          <div className="flex items-center gap-[7px]">
            <span
              className="size-[5px] flex-none rounded-[2px]"
              style={{ background: status.dot }}
            />
            <span className="font-mono text-[8.5px] tracking-[0.14em] text-muted">
              {masked ? "WAITING FOR VERIFIED ACTIVITY" : `LATEST ON THE PLATFORM · ${receipt.ago}`}
            </span>
          </div>
        </header>

        <Perforation className="my-3.5" />

        {/* Itemised lines - replaced by a one-line summary on phones. */}
        <div className="hidden px-[var(--rcpt-pad)] pb-8 pt-3.5 font-mono text-xs md:block">
          <Line
            label={masked ? "FIRM / PLAN" : `${receipt.firm.toUpperCase()} ${receipt.plan.toUpperCase()}`}
            value={masked ? "$•••.••" : money(receipt.list)}
          />
          <Line
            label={masked ? "COUPON ••••••" : `COUPON ${receipt.coupon}`}
            value={masked ? "−$••.••" : `−${money(discount)}`}
            tone="success"
          />
          <Line label="YOU PAID" value={masked ? "$•••.••" : money(youPay)} />
          <Line
            label="CASHBACK RATE"
            value={masked ? "••%" : percent(receipt.cashbackPct)}
            tone="muted"
          />
        </div>

        <Perforation className="mb-3.5 hidden md:block" />

        <footer className="px-[var(--rcpt-pad)] pb-[var(--rcpt-pad)]">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div>
              <p className="mb-[7px] font-mono text-[8.5px] tracking-[0.16em] text-muted">
                {masked ? "MEMBER •••••" : receipt.who} - {status.who}
              </p>
              <p
                data-count={masked ? undefined : true}
                className="font-mono text-[30px] leading-none tracking-[-0.03em] text-primary md:text-[38px]"
              >
                {masked ? "+$••.••" : `+${money(cashback)}`}
              </p>
            </div>
            <div
              ref={stampRef}
              className="rounded-lg border-2 px-3 py-2 font-mono text-xs tracking-[0.2em] [transform:rotate(-8deg)]"
              style={{ borderColor: status.color, color: status.color }}
            >
              {status.stamp}
            </div>
          </div>

          <p className="mt-3.5 hidden font-mono text-[8.5px] tracking-[0.1em] text-muted md:block">
            {status.footer}
          </p>
          {/* Phone summary: the four lines collapsed into one string. */}
          <p className="mt-2.5 w-full font-mono text-[9px] leading-[1.7] tracking-[0.06em] text-muted md:hidden">
            {masked
              ? "$•••.•• LIST · −$••.•• COUPON · PAID $•••.•• · CASHBACK HIDDEN"
              : `${money(receipt.list)} LIST · −${money(discount)} COUPON · PAID ${money(youPay)} · ${receipt.status === "paid" ? "CASHBACK SENT" : "PENDING UNTIL REFUND WINDOW CLOSES"}`}
          </p>

          <Link
            href="/#estimator"
            className="mt-3 inline-block border-b pb-0.5 font-mono text-[9px] tracking-[0.14em] text-primary"
            style={{ borderColor: "color-mix(in oklab, var(--primary) 45%, transparent)" }}
          >
            RUN YOUR OWN NUMBERS ↓
          </Link>
        </footer>
      </div>
    </div>
  );
}
