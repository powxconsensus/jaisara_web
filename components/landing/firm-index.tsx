import Link from "next/link";
import type { Firm } from "@/lib/data/firms";
import { FirmMark } from "@/components/ui/firm-mark";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { moneyBand, moneyCompact, signedMoney } from "@/lib/format";

/**
 * The top firms this week.
 *
 * Sorted by cashback descending. The row leads with the firm's logo rather
 * than a rank number: the number was only ever the position in this sort, so
 * it told you nothing the order did not, and it cost the one slot on the row
 * where a reader is actually looking for the brand.
 */
export function FirmIndex({ firms = [] }: { firms?: Firm[] }) {
  // Ordered by the figure the row prints. It used to sort on the rate while
  // showing the rate, which agreed; now the row shows dollars, and a list whose
  // visible numbers do not descend reads as broken however defensible the
  // hidden key is. A firm with nothing published sorts last rather than
  // claiming a zero.
  const top = [...firms].sort((a, b) => best(b) - best(a)).slice(0, 5);

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
            {/* A logo slot, not a logo square. Nearly every prop firm
                publishes a horizontal wordmark, and `object-contain` inside a
                40px square rendered "LUCID TRADING" about ten pixels tall -
                uploaded, present, and unreadable. Given room to keep its own
                proportions the same file is legible. Narrower on a phone,
                where the firm name needs the width more. */}
            <FirmMark
              name={firm.name}
              mark={firm.mark}
              logoUrl={firm.logoUrl}
              fluid
              size={52}
              className="w-[70px] rounded-[11px] md:w-[132px]"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display text-[17px] font-black uppercase leading-none tracking-[-0.02em] md:text-[clamp(19px,2.8vw,30px)]">
                {firm.name}
              </span>
              {/* What the firm actually is. The categories were already on the
                  wire and shown nowhere on this page, while the row carried a
                  coupon code instead - and the code is the same word on every
                  row, so it distinguished nothing. */}
              {facts(firm).length > 0 && (
                <span className="mt-[7px] block truncate font-mono text-[9.5px] uppercase tracking-[0.13em] text-muted">
                  {facts(firm).join(" · ")}
                </span>
              )}
            </span>
            {/* What the firm sells, in the space the bare type descriptor
                used to occupy. "Evaluation" is a category; "6 challenges from
                $149" is a reason to click. Falls back to the descriptor for a
                firm whose catalogue is not filled in yet. */}
            <span className="hidden flex-none font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted lg:inline">
              {firm.challenges?.length
                ? `${firm.challenges.length} from ${moneyCompact(firm.challenges[0].price)}`
                : firm.kind}
            </span>
            <CashBack firm={firm} />
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

/**
 * Money, not a rate.
 *
 * `49.5% cashback` is read as "half the price back", because that is what the
 * words say - and it is the one reading this figure does not mean. The rate is
 * a share of the commission the firm pays us, so against a $165 challenge it is
 * $81.67, not $81.67 off a $165 bill. Printing the dollars removes the
 * ambiguity entirely: nobody misreads `+$81.67 cash back`.
 *
 * A firm's catalogue spans an order of magnitude, so a single figure would be
 * either the cheapest plan (undersells) or the dearest (the "up to" lie). The
 * band states both ends and is the only honest one-line summary of a firm.
 */
function CashBack({ firm }: { firm: Firm }) {
  const band = payout(firm);

  // No priced catalogue yet. The published rate is all there is, and it is
  // still better than silence - but it keeps the word "of price" beside it so
  // it cannot be read as a discount either.
  if (!band) {
    if (firm.cashback <= 0) {
      return (
        <span className="flex-none text-right font-mono text-[9px] tracking-[0.12em] text-muted">
          RATE COMING
        </span>
      );
    }

    return (
      <span className="flex-none text-right font-mono tabular-nums tracking-[-0.02em] text-primary">
        <span className="block text-[19px] leading-none md:text-[clamp(20px,2.6vw,28px)]">
          {firm.cashback}%
        </span>
        <span className="mt-1.5 block font-mono text-[8.5px] tracking-[0.12em] text-muted">
          OF PRICE, BACK
        </span>
      </span>
    );
  }

  return (
    <span className="flex-none text-right font-mono tabular-nums tracking-[-0.02em] text-primary">
      <span className="block whitespace-nowrap text-[17px] leading-none md:text-[clamp(19px,2.4vw,26px)]">
        {band.low === band.high ? signedMoney(band.high) : moneyBand(band.low, band.high)}
      </span>
      <span className="mt-1.5 block font-mono text-[8.5px] tracking-[0.12em] text-muted">
        CASH BACK
      </span>
    </span>
  );
}

/**
 * What this firm actually pays, across everything it lists.
 *
 * `null` when nothing is priced - which is a real state for a firm added to the
 * catalogue before its plans were, and has to stay distinguishable from a firm
 * that pays nothing.
 */
function payout(firm: Firm): { low: number; high: number } | null {
  const paid = (firm.challenges ?? [])
    .map((challenge) => challenge.cashbackUsd)
    .filter((amount) => amount > 0);

  if (paid.length === 0) return null;
  return { low: Math.min(...paid), high: Math.max(...paid) };
}

/**
 * The sort key: the most this firm gives back on anything it sells.
 *
 * Firms with no priced catalogue fall back to their rate, which puts them below
 * every firm with real figures without dropping them off the list - a rate is a
 * single-digit number and a payout is tens or hundreds of dollars.
 */
function best(firm: Firm): number {
  return payout(firm)?.high ?? firm.cashback;
}

/**
 * The two facts worth the width: what the firm trades and what it sells.
 *
 * Capped at three parts because this line truncates - a firm listing four
 * markets would push out the descriptor, which is the half that says whether
 * the firm is an evaluation shop or an instant-funding one.
 */
function facts(firm: Firm): string[] {
  return [...(firm.markets ?? []).slice(0, 2), firm.kind].filter(Boolean);
}
