import { money } from "@/lib/format";
import { Reveal } from "@/components/ui/reveal";
import { Accent, SectionHeading } from "@/components/ui/section-heading";

/**
 * [01] THE SPLIT — the honest waterfall for one $129 challenge.
 *
 * Wording matters here (handoff §3): the user-facing promise is plain
 * "cashback". This is the one section built to explain the commission
 * mechanics, so it may show the full breakdown — but never as "our cut,
 * shared", and the referrer note must say rewards are paid by Jaisara.
 */

const LIST = 129;
const DISCOUNT_PCT = 20;
const COMMISSION_PCT = 20; // what the firm pays Jaisara on the list price
const PLATFORM_SHARE = 0.3; // Jaisara's share of that commission

const discount = (LIST * DISCOUNT_PCT) / 100; // 25.80 — straight off at checkout
const youPay = LIST - discount; // 103.20 — what the buyer is charged
const commission = (LIST * COMMISSION_PCT) / 100; // 25.80 — firm → Jaisara
const firmKeeps = youPay - commission; // 77.40 — after paying us
const platformKeeps = commission * PLATFORM_SHARE; // 7.74 — runs the platform
const cashback = commission - platformKeeps; // 18.06 — paid after 30 days
const totalBack = discount + cashback; // 43.86 — discount now + cashback later
const totalBackPct = Math.round((totalBack / LIST) * 100); // 34% of list

const CELLS = [
  { figure: money(LIST), label: ["LIST PRICE"], tone: "" },
  { figure: money(youPay), label: ["YOU PAY AT CHECKOUT", `COUPON −${money(discount)}`], tone: "" },
  {
    figure: money(firmKeeps),
    label: ["FIRM NETS", `PAYS US ${money(commission)} COMMISSION`],
    tone: "",
  },
  {
    figure: money(platformKeeps),
    label: ["JAISARA KEEPS", "RUNS THE PLATFORM"],
    tone: "text-club",
  },
  {
    figure: money(totalBack),
    label: ["BACK TO YOU", `${money(discount)} NOW + ${money(cashback)} IN 30D`],
    tone: "text-primary",
    wide: true,
  },
];

export function Split() {
  return (
    <Reveal className="mx-auto max-w-[var(--maxw)] px-[var(--pad)] pb-[var(--secpb)] pt-[var(--secpt)]">
      <SectionHeading index="01" eyebrow="The split">
        <span className="block max-w-[22ch]">
          A ${LIST} challenge, <Accent>dissected.</Accent>
        </span>
      </SectionHeading>

      <p className="mb-10 mt-3.5 max-w-[54ch] text-[15px] leading-[1.68] text-muted">
        The commission already exists — the firm budgets it into every sale. The only question is
        who keeps it. The firm keeps its price, we receive the commission, and we pass most of our
        share to you. Here is where each dollar goes.
      </p>

      <div className="mb-6 flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <span className="font-mono text-[10px] tracking-[0.2em] text-muted">
          TOTAL VALUE BACK TO YOU
        </span>
        <span
          data-count
          className="font-mono text-[clamp(30px,4vw,46px)] leading-none tracking-[-0.03em] text-primary"
        >
          {money(totalBack)}
        </span>
        <span className="font-mono text-xs text-muted">
          = {totalBackPct}% OF THE {money(LIST)} LIST PRICE
        </span>
      </div>

      {/* Proportional bar: firm / platform / you. */}
      <div className="flex h-[clamp(64px,9vw,96px)] w-full gap-[3px] overflow-hidden rounded-[12px]">
        <div className="flex w-[60%] items-end bg-surface-2 px-3.5 py-3 [animation:jsGrow_.9s_.1s_cubic-bezier(.2,.8,.2,1)_both] [transform-origin:left]">
          <span className="truncate font-mono text-[9.5px] tracking-[0.14em] text-muted">
            FIRM NETS {money(firmKeeps)}
          </span>
        </div>
        <div
          className="flex w-[6%] min-w-[34px] items-end px-2.5 py-3 [animation:jsGrow_.9s_.35s_cubic-bezier(.2,.8,.2,1)_both] [transform-origin:left]"
          style={{ background: "color-mix(in oklab, var(--club) 36%, var(--surface))" }}
        >
          <span className="font-mono text-[9.5px] tracking-[0.1em] text-club">US</span>
        </div>
        <div className="flex w-[34%] items-end bg-primary px-3.5 py-3 [animation:jsGrow_.9s_.55s_cubic-bezier(.2,.8,.2,1)_both] [transform-origin:left]">
          <span className="truncate font-mono text-[9.5px] tracking-[0.14em] text-on-primary">
            BACK TO YOU {money(totalBack)}
          </span>
        </div>
      </div>

      {/* Five cells sharing hairline gaps. */}
      <div className="mt-3.5 grid grid-cols-1 gap-px overflow-hidden rounded-[12px] border border-hair bg-hair md:grid-cols-2 lg:grid-cols-5">
        {CELLS.map((cell) => (
          <div
            key={cell.label[0]}
            className={`flex flex-row-reverse items-baseline justify-between gap-3.5 bg-bg px-[15px] py-[13px] md:flex-col md:items-stretch md:gap-[7px] md:px-[22px] md:py-5 ${
              cell.wide ? "md:col-span-2 lg:col-span-1" : ""
            }`}
          >
            <div
              className={`flex-none font-mono text-[17px] tabular-nums tracking-[-0.02em] md:text-[19px] ${cell.tone}`}
            >
              {cell.figure}
            </div>
            <div className="font-mono text-[9px] leading-[1.6] tracking-[0.14em] text-muted">
              {cell.label.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3.5 font-mono text-[9px] leading-[1.7] tracking-[0.1em] text-muted">
        + YOUR REFERRER EARNS 20% ON TOP · PAID BY JAISARA, NEVER FROM YOUR CASHBACK
      </p>
    </Reveal>
  );
}
