"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { type Firm, type PayoutCadence } from "@/lib/data/firms";
import { FilterChip } from "@/components/ui/filter-chip";
import { DealRow } from "./deal-row";
import { CompareTray } from "./compare-tray";

const TYPE_FILTERS = ["All", "Two-step", "One-step", "Instant"] as const;
const PAYOUT_FILTERS = ["All", "Weekly", "Bi-weekly", "On-demand"] as const;
const SORTS = [
  { key: "cashback", label: "CB%" },
  { key: "discount", label: "OFF%" },
  { key: "name", label: "A-Z" },
] as const;
const MIN_CASHBACK = [0, 10, 12, 15] as const;

const PAGE_SIZE = 12;

type TypeFilter = (typeof TYPE_FILTERS)[number];
type PayoutFilter = (typeof PAYOUT_FILTERS)[number];
type SortKey = (typeof SORTS)[number]["key"];

/**
 * Search-first deals index (handoff §4.2): text search, type and payout
 * facets, sortable columns, and a compare tray holding 2-3 firms.
 */
export function DealsIndex({ firms = [] }: { firms?: Firm[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TypeFilter>("All");
  const [payout, setPayout] = useState<PayoutFilter>("All");
  const [sort, setSort] = useState<SortKey>("cashback");
  const [minCashback, setMinCashback] = useState<number>(0);
  const [compare, setCompare] = useState<string[]>([]);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const activeFilterCount =
    Number(type !== "All") +
    Number(payout !== "All") +
    Number(minCashback > 0) +
    Number(sort !== "cashback");
  const activeCoupons = firms.filter(
    (firm) => firm.coupon.trim() && firm.coupon !== "-",
  ).length;
  const bestCashback = firms.reduce(
    (best, firm) => Math.max(best, firm.cashback),
    0,
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = firms.filter((firm) => {
      if (q && !firm.name.toLowerCase().includes(q)) return false;
      if (
        type !== "All" &&
        !firm.kind.toLowerCase().includes(type.toLowerCase())
      )
        return false;
      if (payout !== "All" && firm.payout !== (payout as PayoutCadence))
        return false;
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
      prev.includes(slug)
        ? prev.filter((s) => s !== slug)
        : prev.length >= 3
          ? prev
          : [...prev, slug],
    );

  const clearFilters = () => {
    setQuery("");
    setType("All");
    setPayout("All");
    setMinCashback(0);
    setSort("cashback");
  };

  return (
    <div className="relative overflow-hidden pb-[150px]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-44 -top-56 size-[680px] rounded-full opacity-[0.13] blur-[130px]"
        style={{ background: "var(--primary)" }}
      />
      <div className="relative mx-auto max-w-[var(--maxw)] px-[var(--pad)] pt-[clamp(28px,4vw,48px)]">
        <div className="grid items-end gap-4 border-b border-hair pb-6 md:grid-cols-[auto_1fr] md:gap-x-[clamp(36px,6vw,84px)]">
          <div>
            <p className="mb-2.5 font-mono text-[9px] uppercase tracking-[0.22em] text-primary">
              Deals directory
            </p>
            <h1 className="font-display text-[clamp(38px,5vw,62px)] font-black uppercase leading-none tracking-[-0.035em]">
              Deals<span className="text-primary">.</span>
            </h1>
          </div>

          <div className="md:pb-1">
            <p className="max-w-[62ch] text-[14px] leading-[1.6] text-muted">
              Compare coupons and cashback, then open a firm for exact products
              and eligibility.
            </p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
              <DirectoryFact value={firms.length} label="firms" />
              <DirectoryFact value={activeCoupons} label="coupons" />
              <DirectoryFact
                value={bestCashback > 0 ? `${bestCashback}%` : "Soon"}
                label="best cashback"
                highlighted
              />
              <span className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
                Updated weekly
              </span>
            </div>
          </div>
        </div>

        <div className="mb-5 mt-5 flex items-center gap-2.5 rounded-[16px] border border-hair bg-surface/70 p-2 shadow-[0_24px_70px_-52px_var(--primary)] backdrop-blur-xl">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${firms.length} firms…`}
            aria-label="Search firms"
            className="min-w-0 flex-1 rounded-[11px] border-0 bg-transparent px-4 py-3 text-[13.5px] outline-none placeholder:text-muted focus:bg-bg/50"
          />
          <Dialog.Root>
            <Dialog.Trigger asChild>
              <button
                type="button"
                className="flex flex-none cursor-pointer items-center gap-2 rounded-[11px] border border-hair bg-bg px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] transition hover:border-primary"
              >
                <span aria-hidden="true">☷</span>
                Filters
                {activeFilterCount > 0 && (
                  <span className="grid size-5 place-items-center rounded-full bg-primary text-[9px] text-on-primary">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-[500] bg-[color-mix(in_oklab,var(--bg)_72%,transparent)] backdrop-blur-sm" />
              <Dialog.Content className="fixed bottom-0 left-0 right-0 z-[501] max-h-[88dvh] overflow-y-auto rounded-t-[22px] border border-hair bg-surface p-5 shadow-card md:bottom-0 md:left-auto md:right-0 md:top-0 md:h-dvh md:max-h-none md:w-[min(430px,calc(100%-32px))] md:rounded-none md:rounded-l-[24px] md:p-7">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <Dialog.Title className="font-display text-[24px] font-black uppercase leading-none">
                      Filter deals
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

                <FilterGroup label="Challenge type">
                  {TYPE_FILTERS.map((option) => (
                    <FilterChip
                      key={option}
                      active={type === option}
                      onClick={() => setType(option)}
                    >
                      {option}
                    </FilterChip>
                  ))}
                </FilterGroup>

                <FilterGroup label="Payout schedule">
                  {PAYOUT_FILTERS.map((option) => (
                    <FilterChip
                      key={option}
                      active={payout === option}
                      onClick={() => setPayout(option)}
                    >
                      {option === "All" ? "Any payout" : option}
                    </FilterChip>
                  ))}
                </FilterGroup>

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

                <FilterGroup label="Sort by">
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
                </FilterGroup>

                <div className="mt-7 grid grid-cols-[auto_1fr] gap-2.5">
                  <button
                    type="button"
                    onClick={clearFilters}
                    disabled={activeFilterCount === 0}
                    className="cursor-pointer rounded-[11px] border border-hair px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Reset
                  </button>
                  <Dialog.Close className="cursor-pointer rounded-[11px] bg-primary px-5 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-on-primary">
                    Show {filtered.length} deals
                  </Dialog.Close>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>

        {filtered.length > 0 ? (
          <>
            <div className="overflow-hidden rounded-[20px] border border-hair bg-surface/30">
              {/* Column headings, desktop only. */}
              <div className="hidden grid-cols-[26px_40px_minmax(0,1fr)_104px_96px_96px_34px] gap-x-[clamp(12px,2.2vw,30px)] border-b border-hair bg-surface/70 px-5 py-4 font-mono text-[8.5px] uppercase tracking-[0.18em] text-muted lg:grid">
                <span>##</span>
                <span />
                <span>Firm and offer</span>
                <span>Type</span>
                <span>Coupon</span>
                <span className="text-right">Cashback</span>
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
            </div>

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
            <p className="mb-3.5 font-mono text-[10px] tracking-[0.2em] text-muted">
              NO MATCHES
            </p>
            <p className="mb-2 font-display text-[18px] font-bold">
              No deals match that filter
            </p>
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
          onRemove={(slug) =>
            setCompare((prev) => prev.filter((s) => s !== slug))
          }
          onClear={() => setCompare([])}
        />
      </div>
    </div>
  );
}

function DirectoryFact({
  value,
  label,
  highlighted = false,
}: {
  value: string | number;
  label: string;
  highlighted?: boolean;
}) {
  return (
    <span className={highlighted ? "text-primary" : undefined}>
      <strong className="font-medium text-fg">{value}</strong> {label}
    </span>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="mb-5 border-0 p-0">
      <legend className="mb-2.5 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
        {label}
      </legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}
