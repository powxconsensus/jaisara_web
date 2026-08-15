import Link from "next/link";
import type { Ref } from "react";
import { money, percent } from "@/lib/format";
import { RECEIPT_STATUS, receiptTotals, type Receipt } from "@/lib/data/receipts";
import { BrandMark } from "@/components/ui/brand-mark";
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
    <div className={`flex items-baseline gap-2.5 py-[var(--rcpt-row)] ${toneClass}`}>
      {/* Shrinkable and truncating rather than `flex-none`: the card is narrow
          and a long firm name would otherwise push the figure off the edge of
          the paper. The amount is the one thing that must never be clipped. */}
      <span className="min-w-0 truncate">{label}</span>
      {/* A real border, not letter-spaced dots - it stretches to fill. */}
      <span
        aria-hidden="true"
        className="flex-1 border-b border-dotted"
        style={{ borderColor: "color-mix(in oklab, var(--text) 24%, transparent)" }}
      />
      <span className="flex-none font-medium tabular-nums text-fg">{value}</span>
    </div>
  );
}

/**
 * The bracket at one corner of the sheet.
 *
 * Two edges of a box rather than four, so the accent traces the corner and
 * stops - a full outline would just read as a second border. They sit *inside*
 * the card's own border with a gap, which is what makes the corner look lit
 * rather than framed.
 */
function Corner({ at }: { at: "tl" | "tr" | "bl" | "br" }) {
  const edges = {
    tl: "left-2.5 top-2.5 rounded-tl-[7px] border-l-2 border-t-2",
    tr: "right-2.5 top-2.5 rounded-tr-[7px] border-r-2 border-t-2",
    bl: "bottom-2.5 left-2.5 rounded-bl-[7px] border-b-2 border-l-2",
    br: "bottom-2.5 right-2.5 rounded-br-[7px] border-b-2 border-r-2",
  }[at];

  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute size-[18px] border-primary md:size-[22px] ${edges}`}
    />
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
  sample = false,
}: {
  receipt: Receipt;
  cardRef?: Ref<HTMLDivElement>;
  stampRef?: Ref<HTMLDivElement>;
  /**
   * There is no live feed yet, so the card is showing worked figures.
   *
   * It is not labelled as a sample - that was asked for and removed. What it
   * does instead is describe the mechanism rather than report an event: the
   * caption lines talk about what a coupon and a cashback rate do, in the
   * present tense, and nothing claims that a particular person bought a
   * particular thing at a particular time.
   *
   * That distinction is the whole reason this flag still exists, so keep it:
   * do not reuse the live captions here. "LATEST ON THE PLATFORM · 4 MIN AGO"
   * over invented figures is a false claim about the ledger, and a member name
   * against them would be a fabricated testimonial.
   */
  sample?: boolean;
}) {
  const status = RECEIPT_STATUS[receipt.status];
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
          "0 50px 100px -55px rgba(0,0,0,.8), 0 0 0 1px color-mix(in oklab, var(--primary) 18%, transparent)",
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
      {/* The accent pooling into each corner, under the brackets. Without it
          the brackets float; with it the corner looks like the light source. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-receipt"
        style={{
          background: [
            "radial-gradient(58px circle at 0% 0%, color-mix(in oklab, var(--primary) 16%, transparent), transparent 70%)",
            "radial-gradient(58px circle at 100% 0%, color-mix(in oklab, var(--primary) 16%, transparent), transparent 70%)",
            "radial-gradient(58px circle at 0% 100%, color-mix(in oklab, var(--primary) 16%, transparent), transparent 70%)",
            "radial-gradient(58px circle at 100% 100%, color-mix(in oklab, var(--primary) 16%, transparent), transparent 70%)",
          ].join(", "),
        }}
      />

      <Corner at="tl" />
      <Corner at="tr" />
      <Corner at="bl" />
      <Corner at="br" />

      <div className="relative">
        <header className="px-[var(--rcpt-pad)] pb-3 pt-[var(--rcpt-pad)]">
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <BrandMark className="size-[15px] text-primary" />
              <span className="font-mono text-[11.5px] font-medium tracking-[0.2em]">JAISARA</span>
            </span>
            {/* No reference number without a real order behind it - a made-up
                one looks exactly like a real one. */}
            {!sample && (
              <span className="font-mono text-[10px] tracking-[0.1em] text-muted">
                {receipt.id}
              </span>
            )}
          </div>
          <div className="flex items-center gap-[7px]">
            <span
              className="size-[5px] flex-none rounded-[2px]"
              style={{ background: sample ? "var(--primary)" : status.dot }}
            />
            <span className="font-mono text-[9.5px] tracking-[0.14em] text-muted">
              {sample
                ? "COUPON AT CHECKOUT · CASHBACK AFTER VERIFICATION"
                : `LATEST ON THE PLATFORM · ${receipt.ago}`}
            </span>
          </div>
        </header>

        <Perforation className="my-3.5" />

        {/* Itemised lines - replaced by a one-line summary on phones. */}
        <div className="hidden px-[var(--rcpt-pad)] pb-9 pt-4 font-mono text-[13.5px] text-muted md:block">
          <Line
            label={`${receipt.firm.toUpperCase()} ${receipt.plan.toUpperCase()}`}
            value={money(receipt.list)}
          />
          {receipt.coupon ? (
            <Line label={`COUPON ${receipt.coupon}`} value={`−${money(discount)}`} tone="success" />
          ) : null}
          <Line label="YOU PAID" value={money(youPay)} />
          <Line label="CASHBACK RATE" value={percent(receipt.cashbackPct)} tone="muted" />
        </div>

        <Perforation className="mb-3.5 hidden md:block" />

        <footer className="px-[var(--rcpt-pad)] pb-[var(--rcpt-pad)]">
          {/* The stamp sits on the caption row and the figure runs full width
              beneath it. They used to share one wrapping row, which held while
              the card was 452px and broke the moment it narrowed: the amount
              and the stamp stopped fitting side by side, the stamp wrapped,
              and its -8deg rotation put it straight through the footnote. This
              cannot wrap, at any width. */}
          <div className="flex items-start justify-between gap-3">
            <p className="mb-2 font-mono text-[9.5px] leading-[1.5] tracking-[0.16em] text-muted">
              {sample ? "CASHBACK CREDITED TO YOUR WALLET" : `${receipt.who} - ${status.who}`}
            </p>
            <div
              ref={stampRef}
              className="-mt-0.5 flex-none rounded-lg border-2 px-2.5 py-1.5 font-mono text-[12px] font-medium tracking-[0.2em] [transform:rotate(-8deg)]"
              style={{ borderColor: status.color, color: status.color }}
            >
              {status.stamp}
            </div>
          </div>

          <p
            data-count={sample ? undefined : true}
            className="font-mono text-[34px] font-medium leading-none tracking-[-0.03em] text-primary md:text-[44px]"
          >
            +{money(cashback)}
          </p>

          <p className="mt-4 hidden font-mono text-[9.5px] leading-[1.6] tracking-[0.1em] text-muted md:block">
            {sample
              ? "THE COUPON CUTS THE PRICE · THE CASHBACK COMES BACK AFTER"
              : status.footer}
          </p>
          {/* Phone summary: the four lines collapsed into one string. */}
          <p className="mt-2.5 w-full font-mono text-[10px] leading-[1.7] tracking-[0.06em] text-muted md:hidden">
            {`${money(receipt.list)} LIST · −${money(discount)} COUPON · PAID ${money(youPay)} · ${receipt.status === "paid" ? "CASHBACK SENT" : "PENDING UNTIL REFUND WINDOW CLOSES"}`}
          </p>

          <Link
            href="/#estimator"
            className="mt-3.5 inline-block border-b pb-0.5 font-mono text-[10px] tracking-[0.14em] text-primary"
            style={{ borderColor: "color-mix(in oklab, var(--primary) 45%, transparent)" }}
          >
            RUN YOUR OWN NUMBERS ↓
          </Link>
        </footer>
      </div>
    </div>
  );
}
