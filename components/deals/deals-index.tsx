"use client";

import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ANY_SIZE,
  challengeAtSize,
  firmRange,
  sizeBuckets,
  toAllChallenges,
  type Challenge,
  type Firm,
  type FirmRange,
  type PayoutCadence,
} from "@/lib/data/firms";
import type { SelectOption } from "@/components/ui/filter-select";
import { FilterChip } from "@/components/ui/filter-chip";
import { PageAtmosphere } from "@/components/shell/page-atmosphere";
import { PageField } from "@/components/shell/page-field";
import { cn } from "@/lib/cn";
import { plural } from "@/lib/format";
import { ChallengeIndex } from "./challenge-index";
import { DealFinder, type FinderSelect } from "./deal-finder";
import { DealRow } from "./deal-row";
import { FeaturedCards, pickFeatured } from "./featured-cards";
import { CompareTray } from "./compare-tray";

/**
 * The navbar's column, to the pixel.
 *
 * The bar is `px-[var(--pad)]` on the outside and `max-w-[var(--maxw)]` on the
 * inside, so its plate spans 95→1335 at a 1440 viewport. This page used to put
 * both on one element, which applies the gutter *inside* the 1240 box instead
 * of outside it - content landed at 151→1279, inset 56px from the bar floating
 * directly above it on every edge. Nothing was misaligned by a little; two
 * columns were simply different widths, which is what read as "old".
 *
 * Written as one width rather than a wrapper so a section is still one element:
 * `min()` does outside the box what padding was doing inside it.
 */
const COLUMN = "mx-auto w-[min(var(--maxw),calc(100%-2*var(--pad)))]";

const ANY = "Any";
const TYPE_FILTERS = [ANY, "Two-step", "One-step", "Instant"] as const;
const PAYOUT_FILTERS = [ANY, "Weekly", "Bi-weekly", "On-demand"] as const;
const SORTS = [
  { key: "cashback", label: "Highest cash back" },
  { key: "price", label: "Lowest price" },
  { key: "discount", label: "Biggest discount" },
  { key: "name", label: "A–Z" },
] as const;
const MIN_CASHBACK = [0, 10, 12, 15] as const;

const PAGE_SIZE = 12;

type SortKey = (typeof SORTS)[number]["key"];
type View = "firms" | "challenges";

/** A firm resolved against the active size basis, once, for every consumer. */
interface Row {
  firm: Firm;
  /** The firm's challenge at the chosen size; null under `Any size`. */
  basis: Challenge | null;
  range: FirmRange | null;
  /** Sells nothing at the chosen size - shown, dimmed, and sorted last. */
  absent: boolean;
}

/**
 * The deals marketplace.
 *
 * Structured around the job rather than the brand: title, controls, three
 * headline deals, then the full book. The page used to open with a
 * full-viewport headline, which is landing-page work being done on the screen
 * people arrive at when they already know what they want.
 *
 * The load-bearing idea underneath is the size basis. Cashback is set per
 * product, so any firm-level figure is either a range or a claim about the
 * single most expensive thing that firm sells - "up to $148.98" is true and
 * useless. Naming a size makes two firms comparable, because it asks them the
 * same question.
 */
export function DealsIndex({ firms = [] }: { firms?: Firm[] }) {
  const [query, setQuery] = useState("");
  const [size, setSize] = useState<string>(ANY_SIZE);
  const [market, setMarket] = useState<string>(ANY);
  const [platform, setPlatform] = useState<string>(ANY);
  const [plan, setPlan] = useState<string>(ANY);
  const [type, setType] = useState<string>(ANY);
  const [payout, setPayout] = useState<string>(ANY);
  const [sort, setSort] = useState<SortKey>("cashback");
  const [minCashback, setMinCashback] = useState<number>(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const [compare, setCompare] = useState<string[]>([]);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [view, setView] = useState<View>("firms");
  // Rows open independently. A single-open accordion would collapse the row
  // somebody just compared against the one they are opening.
  //
  // A short catalogue starts open. Collapsing the only firm on the page hides
  // every price behind a click and leaves a single line of text where the
  // content should be - the gesture is only worth making when there is a list
  // long enough to scan.
  const [open, setOpen] = useState<string[]>(() =>
    firms.length <= 2 ? firms.map((firm) => firm.slug) : [],
  );

  const book = useRef<HTMLElement>(null);

  const allChallenges = useMemo(() => toAllChallenges(firms), [firms]);
  const sizes = useMemo(() => sizeBuckets(allChallenges), [allChallenges]);

  const markets = useMemo(() => facet(firms, (firm) => firm.markets ?? []), [firms]);
  const platforms = useMemo(
    () => facet(firms, (firm) => splitPlatforms(firm.platform)),
    [firms],
  );

  // The firm's own account families - LucidPro, LucidFlex. This is the facet
  // that survives a one-firm catalogue, because it varies per product rather
  // than per firm, and it is how somebody actually shops: they remember the
  // plan they want long before the exact size.
  const plans = useMemo<SelectOption[]>(() => {
    const found = new Map<string, number>();
    for (const challenge of allChallenges) {
      if (!challenge.plan) continue;
      found.set(challenge.plan, (found.get(challenge.plan) ?? 0) + 1);
    }
    return [...found]
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [allChallenges]);

  const filtered = useMemo(() => {
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

    return firms.filter((firm) => {
      if (tokens.length > 0) {
        const haystack = searchText(firm);
        if (!tokens.every((token) => haystack.includes(token))) return false;
      }
      if (market !== ANY && !(firm.markets ?? []).includes(market)) return false;
      if (platform !== ANY && !splitPlatforms(firm.platform).includes(platform)) return false;
      if (plan !== ANY && !(firm.challenges ?? []).some((c) => c.plan === plan)) return false;
      if (type !== ANY && !firm.kind.toLowerCase().includes(type.toLowerCase())) return false;
      if (payout !== ANY && firm.payout !== (payout as PayoutCadence)) return false;
      if (firm.cashback < minCashback) return false;
      return true;
    });
  }, [query, market, platform, plan, type, payout, minCashback, firms]);

  // Resolved once, then reused by the rows and the sort.
  const rows = useMemo<Row[]>(() => {
    const resolved = filtered.map((firm) => {
      const basis = size === ANY_SIZE ? null : challengeAtSize(firm, size);
      return { firm, basis, range: firmRange(firm), absent: size !== ANY_SIZE && basis === null };
    });

    return resolved.sort((a, b) => {
      // A firm selling nothing at the chosen size is a real answer, but it is
      // never a better one - it sits below everything that matched.
      if (a.absent !== b.absent) return a.absent ? 1 : -1;
      if (sort === "name") return a.firm.name.localeCompare(b.firm.name);
      if (sort === "discount") return b.firm.discount - a.firm.discount;
      if (sort === "price") return entryPrice(a) - entryPrice(b);
      return cashbackValue(b) - cashbackValue(a);
    });
  }, [filtered, size, sort]);

  // One scale for every bar in the table: the best rate currently on screen.
  // Drawn against a fixed 100% instead, every bar would sit in the first eighth
  // of its track and the column would compare nothing.
  const peakPct = useMemo(
    () =>
      rows.reduce((best, row) => {
        const pct = row.basis ? row.basis.cashbackPct : (row.range?.cashback?.maxPct ?? 0);
        return Math.max(best, pct);
      }, 0),
    [rows],
  );

  const challenges = useMemo(() => {
    let pool = toAllChallenges(filtered);
    if (plan !== ANY) pool = pool.filter((challenge) => challenge.plan === plan);
    return size === ANY_SIZE ? pool : pool.filter((challenge) => challenge.size === size);
  }, [filtered, plan, size]);

  const featured = useMemo(() => pickFeatured(allChallenges, firms), [allChallenges, firms]);

  const compared = compare
    .map((slug) => firms.find((firm) => firm.slug === slug))
    .filter((firm): firm is Firm => Boolean(firm));

  const toggleCompare = (slug: string) =>
    setCompare((prev) =>
      prev.includes(slug)
        ? prev.filter((s) => s !== slug)
        : prev.length >= 3
          ? prev
          : [...prev, slug],
    );

  const toggleOpen = (slug: string) =>
    setOpen((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));

  const couponFor = (slug: string) => firms.find((firm) => firm.slug === slug)?.coupon ?? "";
  const discountFor = (slug: string) => firms.find((firm) => firm.slug === slug)?.discount ?? 0;

  // Only what the `More` drawer holds. The inline selects show their own state
  // on the trigger, so counting them here would badge a button for a choice
  // that is already visible.
  const moreCount = Number(minCashback > 0);

  const narrowed =
    query.trim() !== "" ||
    size !== ANY_SIZE ||
    market !== ANY ||
    platform !== ANY ||
    plan !== ANY ||
    type !== ANY ||
    payout !== ANY ||
    minCashback > 0;

  const shown = view === "challenges" ? challenges.length : filtered.length;
  const total = view === "challenges" ? allChallenges.length : firms.length;
  const noun = view === "challenges" ? "challenge" : "firm";

  // The basis is not a filter - at `$50K` every firm is still listed, just
  // re-priced - so reporting "9 of 9 firms" would describe a narrowing that
  // did not happen. It says what the figures mean instead.
  const summary = [
    size !== ANY_SIZE ? `At ${size}` : null,
    shown !== total
      ? `${shown} of ${total} ${noun}s`
      : size !== ANY_SIZE
        ? plural(shown, noun)
        : `${plural(firms.length, "firm")} · ${plural(allChallenges.length, "deal")}`,
  ]
    .filter(Boolean)
    .join(" · ");

  const clearFilters = () => {
    setQuery("");
    setSize(ANY_SIZE);
    setMarket(ANY);
    setPlan(ANY);
    setPlatform(ANY);
    setType(ANY);
    setPayout(ANY);
    setMinCashback(0);
    setSort("cashback");
  };

  // A facet with one value behind it cannot narrow anything - picking it
  // returns the same list. Rendering it anyway is how a catalogue of one firm
  // ended up with four dropdowns all reading "Any ...", which looks like a
  // marketplace that is broken rather than one that is new.
  const kinds = TYPE_FILTERS.filter(
    (option) =>
      option !== ANY &&
      firms.some((firm) => firm.kind.toLowerCase().includes(option.toLowerCase())),
  );
  const cadences = PAYOUT_FILTERS.filter(
    (option) => option !== ANY && firms.some((firm) => firm.payout === option),
  );

  const selects: FinderSelect[] = ([
    // First, because it is not a filter: it decides what every figure in the
    // table *means*. It was a row of eleven pills, which is honest but costs a
    // whole row and scrolls sideways on a phone; as a select it keeps the
    // counts, and the money columns restate the basis in their own headings.
    sizes.length > 1 && {
      label: "Rates at",
      value: size,
      onChange: setSize,
      options: [
        { value: ANY_SIZE, label: "Any size" },
        ...sizes.map((bucket) => ({
          value: bucket.label,
          label: bucket.label,
          count: bucket.count,
        })),
      ],
    },
    plans.length > 1 && {
      label: "Plan",
      value: plan,
      onChange: setPlan,
      options: [{ value: ANY, label: "Any plan" }, ...plans],
    },
    markets.length > 1 && {
      label: "Market",
      value: market,
      onChange: setMarket,
      options: [{ value: ANY, label: "All markets" }, ...markets],
    },
    platforms.length > 1 && {
      label: "Platform",
      value: platform,
      onChange: setPlatform,
      options: [{ value: ANY, label: "Any platform" }, ...platforms],
    },
    kinds.length > 1 && {
      label: "Challenge type",
      value: type,
      onChange: setType,
      options: [{ value: ANY, label: "Any type" }, ...kinds.map((k) => ({ value: k, label: k }))],
    },
    cadences.length > 1 && {
      label: "Payout",
      value: payout,
      onChange: setPayout,
      options: [
        { value: ANY, label: "Any payout" },
        ...cadences.map((c) => ({ value: c, label: c })),
      ],
    },
    // Last, and on a different rule to the facets above: those disappear when
    // they hold no choice, but sort is never inert - with two rows there are
    // two orders. It is also the only control that changes what "first" means,
    // which is the claim the whole table is making.
    allChallenges.length > 1 && {
      label: "Sort by",
      value: sort,
      onChange: (value: string) => setSort(value as SortKey),
      options: SORTS.map((option) => ({ value: option.key, label: option.label })),
    },
  ] as (FinderSelect | false)[]).filter((entry): entry is FinderSelect => Boolean(entry));

  return (
    // Pulled up under the navbar so the atmosphere passes behind the bar, the
    // same contract the landing hero follows. `overflow-x-clip` rather than
    // `overflow-hidden`: the blooms have to be free to bleed upward past the
    // top of the page, and clipping only the axis that can scroll leaves the
    // vertical one visible.
    <div className="relative -mt-[var(--nav-h)] overflow-x-clip pb-[clamp(80px,8vh,116px)]">
      {/* Behind everything, for the whole scroll: the column is a measure, not
          the edge of the page, and the gutters have to look like margin rather
          than like the content stopped. */}
      <PageField />

      {/* The page reads as two rooms. Up here is the lit stage: what the site
          is, and the three deals worth seeing before you have asked for
          anything. Below is the workbench - flat, unlit, and entirely given
          over to the table and the controls that narrow it. The title stopped
          looking stranded the moment it had a surface to stand on instead of
          a rectangle of page background under the navbar. */}
      <section className="relative">
        <PageAtmosphere />

        <div
          className={cn(
            COLUMN,
            "relative pb-[clamp(20px,2.2vw,28px)] pt-[calc(var(--nav-h)+clamp(30px,2.6vw,40px))]",
          )}
        >
          {/* Identity and scale. Everything that narrows the catalogue lives
              with the table it narrows.

              The count sits in the stat rail, not in the deck as well: the row
              used to print the same 49 at both ends of itself, once as prose and
              once as a pill, which is what made it read as filler. */}
          <header className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
            <div className="min-w-0">
              <h1 className="font-display text-[clamp(26px,3.1vw,38px)] font-black uppercase leading-[0.95] tracking-[-0.035em]">
                Prop firm deals
              </h1>
              <p className="mt-2.5 max-w-[48ch] text-[13px] leading-[1.55] text-muted">
                Every challenge we index, with the checkout discount and the cash back you earn
                on each.
              </p>
            </div>

            {allChallenges.length > 0 && (
              <dl className="flex flex-none items-end gap-7 md:gap-9">
                <Stat value={firms.length} label="Firms" />
                <Stat value={allChallenges.length} label="Deals" live />
                {sizes.length > 1 && <Stat value={sizes.length} label="Account sizes" />}
              </dl>
            )}
          </header>

          {/* Drawn from the whole catalogue, never the filtered one. A rail
              headed "best deals right now" that rearranged itself as somebody
              typed into a search box below it would be reporting something other
              than what it claims. */}
          {allChallenges.length > featured.length && (
            <FeaturedCards
              items={featured}
              onViewAll={() => book.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            />
          )}
        </div>
      </section>

      <div className={cn(COLUMN, "relative")}>
        <section ref={book} className="mt-[clamp(16px,1.8vw,22px)] scroll-mt-24">
          {/* The lens switch belongs on the heading, not in the toolbar. It
              does not narrow anything - it changes what a row *is* - and the
              heading row was carrying a text summary and nothing else. */}
          <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2.5">
            <h2 className="flex items-center gap-2.5 font-display text-[clamp(16px,1.7vw,20px)] font-black uppercase tracking-[-0.02em]">
              <span
                aria-hidden="true"
                className="grid size-6 place-items-center rounded-[8px] border border-hair bg-surface-2 text-[11px] text-primary"
              >
                ▤
              </span>
              All deals
            </h2>

            {allChallenges.length > 1 && firms.length > 1 && (
              /* Last on a phone, where the two labels need a row of their own -
                 left in source order it pushed the summary onto a third line
                 and turned a heading into three. */
              <div className="order-3 flex w-full items-center gap-[3px] rounded-[11px] border border-hair-soft bg-surface-2 p-1 md:order-none md:w-auto">
                {(
                  [
                    { key: "firms", label: `By firm (${filtered.length})` },
                    { key: "challenges", label: `By challenge (${challenges.length})` },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setView(tab.key)}
                    aria-pressed={view === tab.key}
                    className={cn(
                      "cursor-pointer whitespace-nowrap rounded-[9px] px-3.5 py-[7px] text-[11.5px] transition-all duration-[250ms] ease-[cubic-bezier(.2,.8,.2,1)]",
                      view === tab.key
                        ? "bg-surface text-fg shadow-[0_10px_30px_-24px_var(--primary)]"
                        : "text-muted hover:text-fg",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            <p className="ml-auto font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
              <span className={narrowed ? "text-primary" : undefined}>{summary}</span>
              {narrowed && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="ml-3 cursor-pointer uppercase tracking-[0.14em] underline underline-offset-[4px] transition hover:text-fg"
                >
                  Clear
                </button>
              )}
            </p>
          </div>

          <DealFinder
            query={query}
            onQuery={setQuery}
            challengeCount={allChallenges.length}
            selects={selects}
            onOpenMore={() => setMoreOpen(true)}
            moreCount={moreCount}
          />

          {view === "challenges" ? (
            <ChallengeIndex
              challenges={challenges}
              couponFor={couponFor}
              discountFor={discountFor}
              size={size}
            />
          ) : rows.length > 0 ? (
            <>
              <div className="overflow-hidden rounded-[18px] border border-hair bg-[linear-gradient(180deg,color-mix(in_oklab,var(--primary)_6%,var(--surface)),var(--surface)_190px)]">
                {/* Column headings, desktop only. Coupon is not among them: a
                    code is what you use after deciding, not what decides. It
                    lives in the expanded panel beside the challenges it
                    applies to. */}
                {/* The name column is capped rather than `1fr`. Given the
                    slack it took 572px to render 185px of text, and every row
                    had 390px of hole in the middle of it; the bar takes the
                    remainder instead, where a longer track is the difference
                    between two rates you can rank and two you cannot. */}
                <div className="hidden grid-cols-[26px_36px_minmax(0,360px)_minmax(140px,1fr)_96px_128px_34px_14px] gap-x-[clamp(12px,1.7vw,24px)] border-b border-hair bg-[color-mix(in_oklab,var(--surface-2)_70%,transparent)] px-5 py-3 font-mono text-[8.5px] uppercase tracking-[0.16em] text-muted lg:grid">
                  <span>##</span>
                  <span />
                  <span>Firm and offer</span>
                  <span>Rate</span>
                  <span className="text-right">You pay</span>
                  <span className="text-right">
                    {size === ANY_SIZE ? "Cash back" : `Back at ${size}`}
                  </span>
                  <span />
                  <span />
                </div>

                {rows.slice(0, visible).map((row, index) => (
                  <DealRow
                    key={row.firm.slug}
                    firm={row.firm}
                    rank={index + 1}
                    size={size}
                    basis={row.basis}
                    range={row.range}
                    peakPct={peakPct}
                    comparing={compare.includes(row.firm.slug)}
                    onToggleCompare={() => toggleCompare(row.firm.slug)}
                    expanded={open.includes(row.firm.slug)}
                    onToggleExpanded={() => toggleOpen(row.firm.slug)}
                  />
                ))}
              </div>

              {visible < rows.length && (
                <div className="mt-7 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisible((v) => v + PAGE_SIZE)}
                    className="cursor-pointer rounded-[11px] border border-hair bg-surface px-5 py-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted transition hover:border-primary hover:text-fg"
                  >
                    Load more firms ({rows.length - visible} left)
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-card border border-dashed border-hair px-[30px] py-[60px] text-center">
              <p className="mb-3.5 font-mono text-[10px] tracking-[0.2em] text-muted">NO MATCHES</p>
              <p className="mb-2 font-display text-[18px] font-bold">No firms match that search</p>
              <p className="mb-5 text-[13.5px] text-muted">
                Try another account size, a different platform, or clear the search.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="cursor-pointer rounded-[11px] border border-hair px-5 py-3 font-mono text-[10.5px] uppercase tracking-[0.14em]"
              >
                Clear filters
              </button>
            </div>
          )}
        </section>

        <CompareTray
          firms={compared}
          onRemove={(slug) => setCompare((prev) => prev.filter((s) => s !== slug))}
          onClear={() => setCompare([])}
        />
      </div>

      <Dialog.Root open={moreOpen} onOpenChange={setMoreOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[500] bg-[color-mix(in_oklab,var(--bg)_72%,transparent)] backdrop-blur-sm" />
          <Dialog.Content className="fixed bottom-0 left-0 right-0 z-[501] max-h-[88dvh] overflow-y-auto rounded-t-[22px] border border-hair bg-surface p-5 shadow-card md:bottom-0 md:left-auto md:right-0 md:top-0 md:h-dvh md:max-h-none md:w-[min(430px,calc(100%-32px))] md:rounded-none md:rounded-l-[24px] md:p-7">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="font-display text-[24px] font-black uppercase leading-none">
                  More filters
                </Dialog.Title>
                <Dialog.Description className="mt-2 text-[13px] text-muted">
                  Narrow the list without losing any deal details.
                </Dialog.Description>
              </div>
              <Dialog.Close className="grid size-9 cursor-pointer place-items-center rounded-[10px] border border-hair text-muted hover:text-fg">
                <span aria-hidden="true">×</span>
                <span className="sr-only">Close filters</span>
              </Dialog.Close>
            </div>

            <FilterGroup label="Minimum cashback">
              {MIN_CASHBACK.map((value) => (
                <FilterChip
                  key={value}
                  mono
                  active={minCashback === value}
                  onClick={() => setMinCashback(value)}
                >
                  {value === 0 ? "Any rate" : `${value}%+`}
                </FilterChip>
              ))}
            </FilterGroup>

            <div className="mt-7 grid grid-cols-[auto_1fr] gap-2.5">
              <button
                type="button"
                onClick={clearFilters}
                disabled={!narrowed && sort === "cashback"}
                className="cursor-pointer rounded-[11px] border border-hair px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted disabled:cursor-not-allowed disabled:opacity-45"
              >
                Reset
              </button>
              <Dialog.Close className="cursor-pointer rounded-[11px] bg-primary px-5 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-on-primary">
                Show {shown} {shown === 1 ? noun : `${noun}s`}
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

/**
 * Options for one facet, with how many challenges each would leave.
 *
 * Counts overlap on purpose: a firm trading futures and forex contributes its
 * whole catalogue to both, because these are recorded on the firm rather than
 * on the product. They are "deals available in this market", not slices.
 */
function facet(firms: Firm[], values: (firm: Firm) => string[]): SelectOption[] {
  const found = new Map<string, number>();

  for (const firm of firms) {
    const listed = firm.challenges?.length ?? 0;
    for (const value of values(firm)) {
      if (!value) continue;
      found.set(value, (found.get(value) ?? 0) + listed);
    }
  }

  return [...found]
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** `MT4/MT5` is two platforms somebody might filter by, not one. */
function splitPlatforms(platform: string): string[] {
  return platform
    .split("/")
    .map((name) => name.trim())
    .filter((name) => name && name !== "-");
}

/**
 * Everything about a firm that a search should reach.
 *
 * Including the challenge names and sizes is what lets "50k futures" work: the
 * size lives on a product and the market lives on the firm, so matching only
 * the firm's own fields would answer that query with nothing.
 */
function searchText(firm: Firm): string {
  return [
    firm.name,
    firm.kind,
    firm.coupon,
    firm.platform,
    firm.payout,
    ...(firm.markets ?? []),
    ...(firm.challenges ?? []).flatMap((challenge) => [
      challenge.name,
      challenge.plan,
      challenge.size,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** What the row is currently claiming, so the sort matches what is displayed. */
function cashbackValue(row: Row): number {
  if (row.basis) return row.basis.cashbackUsd;
  return row.range?.cashback?.maxUsd ?? 0;
}

/** Cheapest way in - the chosen size, or the cheapest thing the firm sells. */
function entryPrice(row: Row): number {
  if (row.basis) return row.basis.price;
  return row.range?.minPrice ?? Number.POSITIVE_INFINITY;
}

/**
 * One figure in the masthead rail, in the landing hero's idiom so the two
 * screens count things the same way.
 *
 * `live` attaches the status dot to a label rather than spending a whole pill
 * on it. The pill said "49 live deals" beside a deck that already said "49
 * challenges", so the row's two ends repeated each other; the dot keeps the
 * signal and drops the repetition.
 */
function Stat({ value, label, live = false }: { value: number; label: string; live?: boolean }) {
  return (
    <div>
      <dd className="font-mono text-[clamp(19px,2.2vw,24px)] leading-none tabular-nums tracking-[-0.03em]">
        {value.toLocaleString("en-US")}
      </dd>
      <dt className="mt-2 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
        {live && (
          <span
            aria-hidden="true"
            className="size-1.5 flex-none rounded-full bg-primary shadow-[0_0_10px_var(--primary)]"
          />
        )}
        {label}
      </dt>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <fieldset className="mb-5 border-0 p-0">
      <legend className="mb-2.5 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
        {label}
      </legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}
