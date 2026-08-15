import Link from "next/link";
import type { Challenge, Firm } from "@/lib/data/firms";
import { FirmMark } from "@/components/ui/firm-mark";
import { money, moneyCompact, signedMoney } from "@/lib/format";

/**
 * Why a card is here. Each reason is a different computation, so the cards
 * answer different questions instead of ranking one metric three times - which
 * is what a top-three by cashback does, and why it always surfaces the same
 * biggest accounts.
 */
export type FeaturedReason = "cashback" | "value" | "entry";

const REASON_LABEL: Record<FeaturedReason, string> = {
  cashback: "Highest cash back",
  value: "Best value",
  entry: "Lowest entry",
};

export interface FeaturedItem {
  reason: FeaturedReason;
  challenge: Challenge;
  /** The firm's published code, or `""`. Never invented. */
  coupon: string;
  discountPct: number;
  /** Firm-level terms, shown as chips so the card states the deal in full. */
  split: string;
  payout: string;
}

/**
 * Picks the headline deals, one per reason.
 *
 * `value` is the total percentage coming back off list - the checkout discount
 * plus the cashback rate - because that is the only figure accounting for both
 * halves of what this site offers. `entry` requires a published rate: the
 * cheapest thing here is not a deal if nothing comes back.
 */
export function pickFeatured(challenges: Challenge[], firms: Firm[]): FeaturedItem[] {
  const firmOf = (slug: string) => firms.find((firm) => firm.slug === slug);
  const earning = challenges.filter((challenge) => challenge.cashbackUsd > 0);
  if (earning.length === 0) return [];

  const best = (rank: (challenge: Challenge) => number) =>
    earning.reduce((top, challenge) => (rank(challenge) > rank(top) ? challenge : top));

  const candidates: [FeaturedReason, Challenge][] = [
    ["cashback", best((c) => c.cashbackUsd)],
    ["value", best((c) => c.cashbackPct + (firmOf(c.firmSlug)?.discount ?? 0))],
    ["entry", best((c) => -c.price)],
  ];

  // A single challenge can legitimately win two reasons - in a small catalogue
  // it often wins all three. Showing it twice wastes the slot, so a reason
  // whose winner is already on screen is dropped rather than duplicated.
  const used = new Set<string>();
  const picked: FeaturedItem[] = [];

  for (const [reason, challenge] of candidates) {
    const key = `${challenge.firmSlug}/${challenge.slug}`;
    if (used.has(key)) continue;
    used.add(key);

    const firm = firmOf(challenge.firmSlug);
    picked.push({
      reason,
      challenge,
      coupon: firm?.coupon ?? "",
      discountPct: firm?.discount ?? 0,
      split: firm?.split ?? "",
      payout: firm?.payout ?? "",
    });
  }

  return picked;
}

/**
 * The headline deals, as a horizontal rail.
 *
 * A rail rather than a grid so the row keeps its shape whatever the catalogue
 * holds: three cards fill it, one sits at card width instead of stranded in an
 * empty grid, and a longer list scrolls rather than wrapping into a second
 * ragged row.
 */
export function FeaturedCards({
  items,
  onViewAll,
}: {
  items: FeaturedItem[];
  onViewAll: () => void;
}) {
  if (items.length === 0) return null;

  return (
    <section className="mt-[clamp(24px,3vw,38px)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <h2 className="flex items-center gap-2.5 font-display text-[clamp(16px,1.7vw,20px)] font-black uppercase tracking-[-0.02em]">
          <span
            aria-hidden="true"
            className="grid size-6 place-items-center rounded-[8px] bg-[linear-gradient(140deg,var(--primary),color-mix(in_oklab,var(--primary)_45%,transparent))] text-[11px] text-on-primary"
          >
            ★
          </span>
          Best deals right now
        </h2>
        <div className="flex items-center gap-4">
          <span className="hidden font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted md:block">
            Across the whole catalogue
          </span>
          <button
            type="button"
            onClick={onViewAll}
            className="cursor-pointer font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted transition hover:text-primary"
          >
            View all deals →
          </button>
        </div>
      </div>

      {/* Bleeds to the gutter below `lg`, so a scrolled card is cut by the
          window edge rather than by an invisible container edge - the cue that
          says there is more to the right. From `lg` the column is aligned with
          the navbar plate directly above it, so that edge is visible after all
          and bleeding past it would break the alignment it was borrowing. */}
      <div className="-mx-[var(--pad)] overflow-x-auto px-[var(--pad)] pb-1 [scrollbar-width:none] lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
        {/* A rail on phones, a grid on desktop. Fixed-width cards in a 1240px
            column left 260px of dead space at the right-hand end, which reads
            as three cards that failed to load a fourth. */}
        <div className="flex snap-x snap-mandatory gap-3 lg:grid lg:grid-cols-3 lg:gap-4">
          {items.map((item) => (
            <FeaturedCard
              key={`${item.challenge.firmSlug}/${item.challenge.slug}`}
              item={item}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedCard({ item }: { item: FeaturedItem }) {
  const { reason, challenge, coupon, discountPct, split, payout } = item;
  const href = coupon
    ? `/go/${challenge.firmSlug}?coupon=${encodeURIComponent(coupon)}`
    : `/go/${challenge.firmSlug}`;

  const discountUsd = discountPct > 0 ? (challenge.price * discountPct) / 100 : 0;
  const pays = challenge.price - discountUsd;

  // `md:`, never `sm:`. The theme redefines `lg` at 1180px but leaves the
  // default `sm`, and Tailwind emits `sm` after it - so an `sm:` utility
  // silently overrides the `lg:` one beside it on the same property.
  return (
    <article className="flex w-[290px] flex-none snap-start flex-col rounded-[16px] border border-hair bg-[linear-gradient(155deg,color-mix(in_oklab,var(--primary)_9%,var(--surface))_0%,var(--surface)_58%)] p-3.5 transition duration-[250ms] ease-[cubic-bezier(.2,.8,.2,1)] hover:border-primary hover:shadow-[0_26px_64px_-52px_var(--primary)] md:w-[318px] lg:w-auto">
      <span className="mb-3 w-fit rounded-[7px] bg-[color-mix(in_oklab,var(--primary)_18%,transparent)] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-primary">
        {REASON_LABEL[reason]}
      </span>

      {/* Logo and identity on one line. A full-width logo plate above the name
          looked handsome and cost 74px of every card for a mark that is
          recognised at a glance or not at all. */}
      <div className="flex items-center gap-2.5">
        <FirmMark
          name={challenge.firmName}
          mark={challenge.firmMark}
          logoUrl={challenge.firmLogoUrl}
          size={40}
          className="rounded-[11px]"
        />
        <div className="min-w-0">
          <Link
            href={`/firm/${challenge.firmSlug}`}
            className="block truncate font-display text-[16px] font-black uppercase leading-none tracking-[-0.025em] underline-offset-[4px] hover:text-primary hover:underline"
          >
            {challenge.firmName}
          </Link>
          <p className="mt-1 truncate text-[11px] text-muted">
            {[challenge.size, challenge.plan, challenge.name].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      {((split && split !== "-") || payout) && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {[split && split !== "-" ? `${split} split` : null, payout]
            .filter(Boolean)
            .map((chip) => (
            <span
              key={chip as string}
              className="rounded-full bg-surface-2 px-2 py-[3px] text-[10px] text-muted"
            >
              {chip}
            </span>
          ))}
        </div>
      )}

      {/* Both figures on one row. The itemised list this replaces spelled the
          same thing over four lines, and the discount is legible from a struck
          list price beside what you actually pay. */}
      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-hair-soft pt-3">
        <div className="min-w-0">
          <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-muted">You pay</p>
          <p className="mt-1 truncate font-mono text-[19px] leading-none tabular-nums tracking-[-0.02em]">
            {moneyCompact(pays)}
          </p>
          {discountPct > 0 ? (
            <p className="mt-1 truncate font-mono text-[9.5px] tabular-nums text-muted">
              <span className="line-through">{money(challenge.price)}</span>
              <span className="ml-1.5 text-primary">−{discountPct}%</span>
            </p>
          ) : (
            <p className="mt-1 font-mono text-[9.5px] text-muted">List price</p>
          )}
        </div>
        <div className="min-w-0 text-right">
          <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-muted">Cash back</p>
          <p className="mt-1 truncate font-mono text-[19px] leading-none tabular-nums tracking-[-0.02em] text-primary">
            {signedMoney(challenge.cashbackUsd)}
          </p>
          <p className="mt-1 font-mono text-[9.5px] tabular-nums text-muted">
            {challenge.cashbackPct}% back
          </p>
        </div>
      </div>

      <div className="mt-auto pt-3">
        <Link
          href={href}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="block rounded-[10px] border border-[color-mix(in_oklab,var(--primary)_40%,transparent)] px-4 py-2.5 text-center font-mono text-[9.5px] uppercase tracking-[0.14em] text-primary transition hover:bg-[color-mix(in_oklab,var(--primary)_14%,transparent)] hover:text-fg"
        >
          View deal →
        </Link>
      </div>
    </article>
  );
}
