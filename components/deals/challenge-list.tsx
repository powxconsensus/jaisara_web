import Link from "next/link";
import type { Challenge } from "@/lib/data/firms";
import { moneyCompact, signedMoney } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * A firm's challenges, as a row of figures per thing you can buy.
 *
 * Deliberately a table rather than cards. Everything on this site is a ledger -
 * mono numerals, hairline rules, money right-aligned - and the question being
 * asked here is a comparison between rows, which is what a table is for. Cards
 * would put whitespace between the only two numbers anybody is comparing.
 *
 * The cashback is shown in dollars first and as a rate second. `14%` is how you
 * compare two firms; `+$18.06` is what actually decides a purchase, and it is
 * the figure people were previously never shown anywhere on the storefront.
 */
export function ChallengeList({
  challenges,
  coupon,
  discountPct = 0,
  highlightSize,
  emptyHint,
}: {
  challenges: Challenge[];
  /** Appended to the tracked link so the code is applied at the firm. */
  coupon: string;
  /** The firm's checkout discount, for the price actually paid. */
  discountPct?: number;
  /** The active size basis, marked so it can be found in the full list. */
  highlightSize?: string;
  emptyHint?: string;
}) {
  if (challenges.length === 0) {
    return (
      <p className="px-1 py-6 text-center font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted">
        {emptyHint ?? "No challenges listed yet"}
      </p>
    );
  }

  return (
    <div className="flex flex-col">
      {challenges.map((challenge) => (
        <ChallengeRow
          key={challenge.slug}
          challenge={challenge}
          coupon={coupon}
          discountPct={discountPct}
          highlighted={Boolean(highlightSize) && challenge.size === highlightSize}
        />
      ))}

      {/* The proposition, once per firm rather than once per row. Two rewards
          from one purchase is the entire pitch and it was stated nowhere on
          the storefront - the discount and the cashback were separate numbers
          in separate columns that nobody was told to add together. */}
      {coupon && discountPct > 0 && (
        <p className="mt-1 border-t border-hair-soft pt-3 text-[11.5px] leading-[1.6] text-muted">
          <span className="font-mono tracking-[0.04em] text-primary">{coupon}</span> takes{" "}
          {discountPct}% off at checkout, and the cash back arrives after - both
          on every challenge above.
        </p>
      )}
    </div>
  );
}

function ChallengeRow({
  challenge,
  coupon,
  discountPct,
  highlighted,
}: {
  challenge: Challenge;
  coupon: string;
  discountPct: number;
  highlighted: boolean;
}) {
  // The same tracked redirect the firm page uses - a challenge bought from
  // here has to carry the member's sub-id too, or the click that corroborates
  // the later claim is never recorded.
  const href = coupon
    ? `/go/${challenge.firmSlug}?coupon=${encodeURIComponent(coupon)}`
    : `/go/${challenge.firmSlug}`;

  const pays = discountPct > 0 ? challenge.price * (1 - discountPct / 100) : null;

  return (
    <div
      className={cn(
        "group/challenge grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-t border-hair-soft py-3 first:border-t-0 sm:grid-cols-[68px_minmax(0,1fr)_92px_112px_auto]",
        highlighted && "-mx-2 rounded-[9px] bg-[color-mix(in_oklab,var(--primary)_7%,transparent)] px-2",
      )}
    >
      <span
        className={cn(
          "order-1 font-mono text-[12.5px] tabular-nums sm:order-none",
          highlighted ? "text-primary" : "text-fg",
        )}
      >
        {challenge.size ?? "—"}
      </span>

      <span className="order-3 col-span-2 min-w-0 truncate text-[13px] text-muted sm:order-none sm:col-span-1">
        {challenge.plan ? (
          <>
            <span className="text-fg">{challenge.plan}</span>
            <span className="px-1.5 text-hair">/</span>
          </>
        ) : null}
        {challenge.name}
      </span>

      {/* What it costs after the code, with the list price kept beside it -
          a discounted figure with nothing to compare against is just a price. */}
      <span className="order-2 justify-self-end text-right font-mono tabular-nums sm:order-none sm:justify-self-start sm:text-left">
        <span className="block text-[12.5px] text-fg">
          {moneyCompact(pays ?? challenge.price)}
        </span>
        {pays !== null && (
          <span className="block text-[8.5px] tracking-[0.08em] text-muted">
            {moneyCompact(challenge.price)} list
          </span>
        )}
      </span>

      {/* Never a zero. A challenge whose rate has not been published has no
          figure to show, and "+$0.00 back" reads as an offer of nothing. */}
      {challenge.cashbackUsd > 0 ? (
        <span className="order-4 justify-self-end text-right font-mono tabular-nums sm:order-none">
          <span className="block text-[12.5px] text-primary">
            {signedMoney(challenge.cashbackUsd)}
          </span>
          <span className="block text-[8.5px] tracking-[0.08em] text-muted">
            {challenge.cashbackPct}% back
          </span>
        </span>
      ) : (
        <span className="order-4 justify-self-end font-mono text-[9px] tracking-[0.12em] text-muted sm:order-none">
          RATE COMING
        </span>
      )}

      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="order-5 col-span-2 mt-1 rounded-[9px] border border-hair px-3 py-2 text-center font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted transition hover:border-primary hover:text-fg sm:order-none sm:col-span-1 sm:mt-0"
      >
        Buy →
      </Link>
    </div>
  );
}
