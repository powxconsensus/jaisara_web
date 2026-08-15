import Link from "next/link";
import { useId } from "react";
import { ANY_SIZE, type Challenge, type Firm, type FirmRange } from "@/lib/data/firms";
import { ChallengeList } from "@/components/deals/challenge-list";
import { FirmMark } from "@/components/ui/firm-mark";
import { moneyBand, moneyCompact, percentRange, signedMoney } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * One row of the deals index.
 *
 * The cashback is stated in dollars first and as a rate second. `14%` is how
 * two firms get compared; `+$38.87` is what decides a purchase, and it is what
 * actually arrives.
 *
 * Which dollars, though, depends entirely on the active size basis - a firm's
 * catalogue spans an order of magnitude, so an unqualified figure is either a
 * range or a lie. With a size chosen the row describes that size and nothing
 * else; with `Any size` it shows the spread, which at least reports both ends.
 *
 * Clicking the row opens the firm's challenges underneath rather than
 * navigating. The firm name stays a direct link, because burying the only
 * route to the firm page behind an expand trades one dead end for another.
 */
export function DealRow({
  firm,
  rank,
  size,
  basis,
  range,
  peakPct,
  comparing,
  onToggleCompare,
  expanded,
  onToggleExpanded,
}: {
  firm: Firm;
  rank: number;
  /** The active basis, or `ANY_SIZE`. */
  size: string;
  /** This firm's challenge at that size - null when it sells none. */
  basis: Challenge | null;
  range: FirmRange | null;
  /** Best rate among the rows on screen, so the bars share one scale. */
  peakPct: number;
  comparing: boolean;
  onToggleCompare: () => void;
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  const panelId = useId();
  const challenges = firm.challenges ?? [];
  const sized = size !== ANY_SIZE;
  // A firm with nothing at the chosen size still belongs on the page - it is a
  // real answer to "who sells a $50K account", just a negative one. Dimming it
  // says so without dropping the firm out of the directory entirely.
  const absent = sized && basis === null;

  return (
    <div className={cn("border-b border-hair-soft last:border-b-0", absent && "opacity-45")}>
      {/* The money column is fixed on phones rather than `auto`. Sized to its
          contents it grew to fit the longest sub-label and left 82px for the
          firm name, which ellipsised even "FUNDINGPIPS". Fixed, the name gets
          everything that is left over no matter what the figures say. */}
      <div className="group relative grid grid-cols-[30px_minmax(0,1fr)_92px_14px] items-center gap-x-2.5 gap-y-1.5 px-4 py-[14px] md:grid-cols-[30px_minmax(0,1fr)_132px_14px] md:gap-x-4 lg:gap-x-[clamp(12px,1.7vw,24px)] transition duration-[250ms] ease-[cubic-bezier(.2,.8,.2,1)] hover:bg-[linear-gradient(90deg,color-mix(in_oklab,var(--primary)_8%,transparent),color-mix(in_oklab,var(--surface)_72%,transparent))] md:px-5 lg:grid-cols-[26px_36px_minmax(0,360px)_minmax(140px,1fr)_96px_128px_34px_14px]">
        {/* The whole row toggles the panel; the firm link and the compare
            button sit above it. Interactive elements cannot nest, so these are
            siblings raised over it rather than children of it. */}
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          aria-controls={panelId}
          className="absolute inset-0 z-0 cursor-pointer"
          aria-label={
            challenges.length > 0
              ? `${expanded ? "Hide" : "Show"} ${challenges.length} ${firm.name} challenges`
              : `${expanded ? "Hide" : "Show"} ${firm.name} details`
          }
        />

        {/* Desktop only. On a phone the compare toggle takes this cell: rank
            is conveyed by scroll position anyway, and a 30px button and a rank
            number cannot share 30px without one of them shoving the firm name
            into an ellipsis. */}
        <span className="pointer-events-none z-10 hidden font-mono text-[10.5px] text-muted lg:block">
          {String(rank).padStart(2, "0")}
        </span>

        <span className="pointer-events-none z-10 hidden transition-transform duration-300 group-hover:scale-105 lg:block">
          <FirmMark
            name={firm.name}
            mark={firm.mark}
            logoUrl={firm.logoUrl}
            size={36}
            className="rounded-[10px]"
          />
        </span>

        <div className="pointer-events-none z-10 col-start-2 min-w-0 lg:col-start-auto">
          {/* The direct route to the firm page, always visible - no expand
              required to reach it. */}
          <Link
            href={`/firm/${firm.slug}`}
            className="pointer-events-auto relative z-10 block truncate font-display text-[15px] font-black uppercase leading-none tracking-[-0.02em] underline-offset-[5px] hover:text-primary hover:underline md:text-[17px] lg:text-[19px]"
          >
            {firm.name}
          </Link>
          {/* Only facts we have. A firm with no coupon discount and no recorded
              profit split used to render "0% OFF · - SPLIT", which states two
              things that are not true rather than saying nothing.

              Split in two so the wide column earns its width without the phone
              truncating the useful half. What the firm sells stays at every
              size; where it trades - markets, platform, split - appears once
              there is room, and those three were sitting unused in the data
              while this line said "11 challenges" into 500px of nothing. */}
          <p
            className={cn(
              "mt-1 truncate text-[11.5px] leading-[1.45]",
              firm.tag ? "text-primary" : "text-muted",
            )}
          >
            {[
              firm.tag,
              basis ? [basis.plan, basis.name].filter(Boolean).join(" · ") : null,
              !sized && challenges.length > 0
                ? `${challenges.length} ${challenges.length === 1 ? "challenge" : "challenges"}`
                : null,
              firm.payout,
            ]
              .filter(Boolean)
              .join(" · ")}
            {detail(firm).length > 0 && (
              <span className="hidden text-muted lg:inline"> · {detail(firm).join(" · ")}</span>
            )}
          </p>
        </div>

        {/* The rate, as a shape. Two firms three rows apart are hard to rank
            from "12%" and "9.4%" alone, and this column was empty space in the
            middle of the only two figures anybody is comparing. Scaled to the
            best rate on screen rather than to 100%, because nothing here pays
            100% and a bar that never fills reports nothing. */}
        <span className="pointer-events-none z-10 hidden self-center lg:block">
          <RateBar basis={basis} range={range} sized={sized} peakPct={peakPct} />
        </span>

        {/* What it costs after the code, not the list price. The coupon column
            that used to sit here is gone: a code is what you use after
            deciding, never what decides, and it was holding 100px hostage in
            the middle of the two figures people actually compare. It lives in
            the expanded panel beside the challenges it applies to. */}
        <span className="pointer-events-none z-10 hidden text-right font-mono tabular-nums lg:block">
          {basis ? (
            <>
              <span className="block text-[13px] text-fg">
                {moneyCompact(pays(basis.price, firm.discount))}
              </span>
              {firm.discount > 0 && (
                <span className="block text-[8.5px] text-muted line-through">
                  {moneyCompact(basis.price)}
                </span>
              )}
            </>
          ) : range && !sized ? (
            <span className="block text-[13px] text-fg">
              {moneyBand(
                pays(range.minPrice, firm.discount),
                pays(range.maxPrice, firm.discount),
              )}
            </span>
          ) : (
            <span className="block text-[13px] text-muted">—</span>
          )}
        </span>

        <div className="pointer-events-none z-10 self-center text-right">
          <CashbackFigure firm={firm} size={size} basis={basis} range={range} sized={sized} />
        </div>

        <button
          type="button"
          onClick={onToggleCompare}
          aria-pressed={comparing}
          title={comparing ? `Remove ${firm.name} from compare` : `Compare ${firm.name}`}
          className={cn(
            "z-10 col-start-1 row-start-1 grid size-[30px] cursor-pointer place-items-center rounded-[9px] border text-[14px] transition-all duration-[180ms] lg:col-start-auto lg:row-start-auto lg:size-[32px] lg:justify-self-end",
            comparing
              ? "border-primary bg-[color-mix(in_oklab,var(--primary)_16%,transparent)] text-primary"
              : "border-hair text-muted hover:border-primary",
          )}
        >
          {comparing ? "−" : "+"}
          <span className="sr-only">
            {comparing ? `Remove ${firm.name} from compare` : `Compare ${firm.name}`}
          </span>
        </button>

        <span
          aria-hidden="true"
          className={cn(
            // Shown at every width. On phones the row is the only affordance
            // there is, so hiding the one mark that says it opens left the
            // expansion undiscoverable exactly where people browse most.
            "pointer-events-none z-10 block text-[10px] text-muted transition-transform duration-[250ms] group-hover:text-fg",
            expanded && "rotate-180",
          )}
        >
          ▾
        </span>
      </div>

      {expanded && (
        <div
          id={panelId}
          className="px-4 pb-4 md:px-5 [animation:jsUp_.35s_cubic-bezier(.2,.8,.2,1)_both]"
        >
          <div className="rounded-[13px] border border-hair bg-surface px-4 py-2.5">
            <div className="flex items-center justify-between gap-3 border-b border-hair-soft pb-2.5">
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
                {challenges.length > 0
                  ? `${challenges.length} ${challenges.length === 1 ? "challenge" : "challenges"}`
                  : "Catalogue"}
              </span>
              <Link
                href={`/firm/${firm.slug}`}
                className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted transition hover:text-primary"
              >
                Firm page →
              </Link>
            </div>
            {/* The full catalogue, never filtered to the active size. Somebody
                who opened a firm is asking what it sells, and answering with
                one row would hide the cheaper account next to it. */}
            <ChallengeList
              challenges={challenges}
              coupon={firm.coupon}
              discountPct={firm.discount}
              highlightSize={sized ? size : undefined}
              emptyHint={`No ${firm.name} challenges listed yet`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Where the firm trades, for the desktop half of the metadata line.
 *
 * Markets are capped at two and the platform list at its first entry: this is a
 * single truncating line, and a firm listing four markets and `MT4/MT5/cTrader`
 * would push the profit split - the one number a trader actually weighs - off
 * the end of it.
 */
function detail(firm: Firm): string[] {
  // A dash is how the catalogue records "not known", and it reaches here as a
  // literal string. Printed straight through it renders "Futures · -", which
  // looks like a rendering fault rather than like missing data.
  const known = (value?: string | null) => {
    const trimmed = value?.trim();
    return trimmed && trimmed !== "-" && trimmed !== "—" ? trimmed : null;
  };

  const platform = known(firm.platform)?.split(/[/,]/)[0]?.trim();
  const split = known(firm.split);

  return [
    ...(firm.markets ?? []).slice(0, 2),
    platform || null,
    split ? `${split} split` : null,
  ].filter((part): part is string => Boolean(part));
}

/**
 * The cashback rate drawn to scale.
 *
 * Under a chosen size it is one number, so the bar fills from zero - "how much,
 * against the best on screen". Under `Any size` the firm has a spread, and a
 * bar drawn to the top of that spread would quietly re-tell the "up to" lie the
 * size basis exists to remove; a floating segment from the firm's worst rate to
 * its best says the true thing instead, and its length is the spread.
 */
function RateBar({
  basis,
  range,
  sized,
  peakPct,
}: {
  basis: Challenge | null;
  range: FirmRange | null;
  sized: boolean;
  peakPct: number;
}) {
  if (peakPct <= 0) return null;

  const span = basis
    ? basis.cashbackPct > 0
      ? { from: 0, to: basis.cashbackPct, floating: false }
      : null
    : !sized && range?.cashback && range.cashback.maxPct > 0
      ? { from: range.cashback.minPct, to: range.cashback.maxPct, floating: true }
      : null;

  if (!span) return <span className="block h-[5px] rounded-full bg-hair-soft" />;

  const left = (span.from / peakPct) * 100;
  const width = Math.max(((span.to - span.from) / peakPct) * 100, span.floating ? 4 : 2);

  return (
    <span className="block">
      <span className="block h-[5px] w-full overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--text)_7%,transparent)]">
        <span
          className="block h-full rounded-full bg-[linear-gradient(90deg,color-mix(in_oklab,var(--primary)_45%,transparent),var(--primary))]"
          style={{ marginLeft: `${Math.min(left, 96)}%`, width: `${Math.min(width, 100 - left)}%` }}
        />
      </span>
      <span className="mt-[7px] block font-mono text-[9px] tabular-nums tracking-[0.04em] text-muted">
        {span.from === span.to || !span.floating
          ? `${span.to}% back`
          : `${percentRange(span.from, span.to)} back`}
      </span>
    </span>
  );
}

/**
 * Never a zero and never an unqualified figure.
 *
 * A firm whose rate has not been published has no rate to show - "0% cashback"
 * reads as an offer rather than as missing data. A firm with no product at the
 * chosen size has no figure either, and substituting a different size's number
 * is exactly the misdirection the size basis exists to remove.
 */
function CashbackFigure({
  firm,
  size,
  basis,
  range,
  sized,
}: {
  firm: Firm;
  size: string;
  basis: Challenge | null;
  range: FirmRange | null;
  sized: boolean;
}) {
  if (sized && !basis) {
    return (
      <p className="font-mono text-[8.5px] uppercase leading-[1.45] tracking-[0.1em] text-muted">
        Nothing at {size}
      </p>
    );
  }

  if (basis) {
    if (basis.cashbackUsd <= 0) return <RateComing />;
    return (
      <>
        <p className="font-mono text-[16px] leading-none tabular-nums tracking-[-0.02em] text-primary md:text-[21px]">
          {signedMoney(basis.cashbackUsd)}
        </p>
        {/* Below `lg` only: the rate bar carries this on desktop, and the
            column heading already names the size. */}
        <p className="mt-1 whitespace-nowrap font-mono text-[8.5px] leading-[1.45] tracking-[0.1em] text-muted lg:hidden">
          {basis.cashbackPct}% at {size}
        </p>
        {/* The list column is desktop-only, so below it the price rides along
            here - a cashback figure with no price beside it cannot be judged,
            and most of this traffic is on phones. On its own line rather than
            appended: joined with a separator it wrapped, orphaning a leading
            "·" onto the second line. */}
        <p className="whitespace-nowrap font-mono text-[8.5px] leading-[1.45] tracking-[0.1em] text-muted lg:hidden">
          {moneyCompact(pays(basis.price, firm.discount))} to buy
        </p>
      </>
    );
  }

  if (range?.cashback) {
    const { minUsd, maxUsd, minPct, maxPct } = range.cashback;
    return (
      <>
        <p className="whitespace-nowrap font-mono text-[13.5px] leading-none tabular-nums tracking-[-0.02em] text-primary md:text-[18px]">
          {minUsd === maxUsd ? signedMoney(maxUsd) : moneyBand(minUsd, maxUsd)}
        </p>
        <p className="mt-1 whitespace-nowrap font-mono text-[8.5px] leading-[1.45] tracking-[0.1em] text-muted lg:hidden">
          {percentRange(minPct, maxPct)} back
        </p>
        {range && (
          <p className="whitespace-nowrap font-mono text-[8.5px] leading-[1.45] tracking-[0.1em] text-muted lg:hidden">
            from {moneyCompact(pays(range.minPrice, firm.discount))}
          </p>
        )}
      </>
    );
  }

  // No catalogue at all: fall back to the firm's published headline rate,
  // which is all the API gives for a firm whose products are not priced yet.
  if (firm.cashback > 0) {
    return (
      <>
        <p className="font-mono text-[18px] leading-none tabular-nums tracking-[-0.02em] text-primary md:text-[21px]">
          {firm.cashback}%
        </p>
        <p className="mt-1 whitespace-nowrap font-mono text-[8.5px] tracking-[0.1em] text-muted">
          cashback
        </p>
      </>
    );
  }

  return <RateComing />;
}

function RateComing() {
  return (
    <p className="whitespace-nowrap font-mono text-[8.5px] tracking-[0.12em] text-muted">
      RATE COMING
    </p>
  );
}

/** What somebody actually pays once the firm's code is applied. */
function pays(price: number, discountPct: number): number {
  return discountPct > 0 ? price * (1 - discountPct / 100) : price;
}
