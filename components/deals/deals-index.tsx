"use client";

import { useMemo, useState } from "react";
import { type Firm, type PayoutCadence } from "@/lib/data/firms";
import { FilterChip } from "@/components/ui/filter-chip";
import { DealRow } from "./deal-row";
import { CompareTray } from "./compare-tray";

const TYPE_FILTERS = ["All", "Two-step", "One-step", "Instant"] as const;
const PAYOUT_FILTERS = ["All", "Weekly", "Bi-weekly", "On-demand"] as const;
const SORTS = [
  { key: "cashback", label: "CB%" },
  { key: "discount", label: "OFF%" },
  { key: "name", label: "A–Z" },
] as const;
const MIN_CASHBACK = [0, 10, 12, 15] as const;

const PAGE_SIZE = 12;

type TypeFilter = (typeof TYPE_FILTERS)[number];
type PayoutFilter = (typeof PAYOUT_FILTERS)[number];
type SortKey = (typeof SORTS)[number]["key"];

/**
 * Search-first deals index (handoff §4.2): text search, type and payout
 * facets, sortable columns, and a compare tray holding 2–3 firms.
 */
export function DealsIndex({ firms = [] }: { firms?: Firm[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TypeFilter>("All");
  const [payout, setPayout] = useState<PayoutFilter>("All");
  const [sort, setSort] = useState<SortKey>("cashback");
  const [minCashback, setMinCashback] = useState<number>(0);
  const [compare, setCompare] = useState<string[]>([]);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = firms.filter((firm) => {
      if (q && !firm.name.toLowerCase().includes(q)) return false;
      if (type !== "All" && !firm.kind.toLowerCase().includes(type.toLowerCase())) return false;
      if (payout !== "All" && firm.payout !== (payout as PayoutCadence)) return false;
      if (firm.cashback < minCashback) return false;
      return true;
    });

    return matches.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "discount") return b.discount - a.discount;
      return b.cashback - a.cashback;
    });
  }, [query, type, payout, sort, minCashback, firms]);

  const compared = compare
    .map((slug) => firms.find((firm) => firm.slug === slug))
    .filter((firm): firm is Firm => Boolean(firm));

  const toggleCompare = (slug: string) =>
    setCompare((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : prev.length >= 3 ? prev : [...prev, slug],
    );

  const clearFilters = () => {
    setQuery("");
    setType("All");
    setPayout("All");
    setMinCashback(0);
  };

  return (
    <div className="mx-auto max-w-[var(--maxw)] px-[var(--pad)] pb-[150px] pt-[clamp(36px,5vw,64px)]">
      <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
        [ Deals ] {firms.length} firms indexed · more added weekly
      </p>
      <h1 className="mb-3.5 font-display text-[clamp(32px,5vw,64px)] font-black uppercase leading-[0.96] tracking-[-0.025em]">
        Every firm.
        <br />
        <span
          className="text-transparent"
          style={{ WebkitTextStroke: "1.5px color-mix(in oklab, var(--text) 72%, transparent)" }}
        >
          One list.
        </span>
      </h1>
      <p className="mb-8 max-w-[52ch] text-[15px] leading-[1.65] text-muted">
        Cashback is a share of the challenge price, credited after the firm&rsquo;s refund window
        closes.
      </p>

      <div className="mb-7 flex flex-wrap items-center gap-x-[18px] gap-y-3.5 border-b border-hair pb-6 pt-3.5">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search ${firms.length} firms…`}
          aria-label="Search firms"
          className="min-w-[180px] max-w-full flex-[1_1_200px] rounded-[10px] border border-hair bg-surface px-3.5 py-[11px] text-[13.5px] outline-none focus:border-primary md:max-w-[300px]"
        />

        <div className="flex flex-nowrap gap-[7px] overflow-x-auto pb-0.5 md:flex-wrap md:overflow-visible [&::-webkit-scrollbar]:hidden">
          {TYPE_FILTERS.map((option) => (
            <FilterChip key={option} active={type === option} onClick={() => setType(option)}>
              {option}
            </FilterChip>
          ))}
        </div>

        <div className="flex flex-nowrap gap-[7px] overflow-x-auto pb-0.5 md:flex-wrap md:overflow-visible [&::-webkit-scrollbar]:hidden">
          {PAYOUT_FILTERS.map((option) => (
            <FilterChip key={option} active={payout === option} onClick={() => setPayout(option)}>
              {option === "All" ? "Any payout" : option}
            </FilterChip>
          ))}
        </div>

        <div className="flex-1" />

        <div className="flex flex-nowrap items-center gap-2.5 overflow-x-auto pb-0.5 md:flex-wrap md:overflow-visible [&::-webkit-scrollbar]:hidden">
          <span className="flex-none font-mono text-[9.5px] tracking-[0.16em] text-muted">SORT</span>
          <div className="flex gap-1.5">
            {SORTS.map((option) => (
              <FilterChip
                key={option.key}
                mono
                active={sort === option.key}
                onClick={() => setSort(option.key)}
              >
                {option.label}
              </FilterChip>
            ))}
          </div>
          <span className="flex-none font-mono text-[9.5px] tracking-[0.16em] text-muted">
            MIN CB
          </span>
          <div className="flex gap-1.5">
            {MIN_CASHBACK.map((value) => (
              <FilterChip
                key={value}
                mono
                active={minCashback === value}
                onClick={() => setMinCashback(value)}
              >
                {value === 0 ? "Any" : `${value}%+`}
              </FilterChip>
            ))}
          </div>
        </div>
      </div>

      {filtered.length > 0 ? (
        <>
          {/* Column headings, desktop only. */}
          <div className="hidden grid-cols-[26px_40px_minmax(0,1fr)_104px_96px_96px_34px] gap-x-[clamp(12px,2.2vw,30px)] px-2.5 pb-3 font-mono text-[8.5px] tracking-[0.18em] text-muted lg:grid">
            <span>##</span>
            <span />
            <span>FIRM</span>
            <span>TYPE</span>
            <span>COUPON</span>
            <span className="text-right">CB%</span>
            <span />
          </div>

          {filtered.slice(0, visible).map((firm, index) => (
            <DealRow
              key={firm.slug}
              firm={firm}
              rank={index + 1}
              comparing={compare.includes(firm.slug)}
              onToggleCompare={() => toggleCompare(firm.slug)}
            />
          ))}
          <div className="border-t border-hair-soft" />

          {visible < filtered.length && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="cursor-pointer rounded-[10px] border border-hair px-5 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted transition hover:border-primary hover:text-fg"
              >
                Load more ({filtered.length - visible} left)
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-card border border-dashed border-hair px-[30px] py-[60px] text-center">
          <p className="mb-3.5 font-mono text-[10px] tracking-[0.2em] text-muted">NO MATCHES</p>
          <p className="mb-2 font-display text-[18px] font-bold">No deals match that filter</p>
          <p className="mb-5 text-[13.5px] text-muted">
            Try a lower cashback threshold, or clear the firm filter.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="cursor-pointer rounded-[10px] border border-hair px-5 py-3 font-mono text-[11px] uppercase tracking-[0.14em]"
          >
            Clear filters
          </button>
        </div>
      )}

      <CompareTray
        firms={compared}
        onRemove={(slug) => setCompare((prev) => prev.filter((s) => s !== slug))}
        onClear={() => setCompare([])}
      />
    </div>
  );
}
