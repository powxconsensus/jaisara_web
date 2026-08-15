"use client";

import { useEffect, useRef } from "react";
import { FilterSelect, type SelectOption } from "@/components/ui/filter-select";

export interface FinderSelect {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}

/**
 * The controls for the deals table.
 *
 * Deliberately not at the top of the page. A search field pinned under the
 * navbar is two stacked bars before any content, and worse, it was filtering
 * the featured rail as well - so a section headed "best deals right now"
 * quietly changed as somebody typed. Sitting inside the table's own section,
 * it obviously governs the table and nothing else.
 *
 * Exactly two rows: the field, then everything that narrows what it searches.
 * It ran to four once - search, facets, lens switch, size pills - and four rows
 * of chrome above a table is a control panel with a table attached. The lens
 * switch moved to the heading (it changes what a row is, not which rows show)
 * and the size basis became the first select, which is what got it here.
 */
export function DealFinder({
  query,
  onQuery,
  challengeCount,
  selects,
  onOpenMore,
  moreCount,
}: {
  query: string;
  onQuery: (value: string) => void;
  challengeCount: number;
  /** The size basis, the facets that hold a real choice, and sort. */
  selects: FinderSelect[];
  onOpenMore: () => void;
  moreCount: number;
}) {
  // Anything with more than one thing in it is worth searching. Below that the
  // controls are decoration.
  const searchable = challengeCount > 1;
  const search = useRef<HTMLInputElement>(null);

  // `/` focuses search, the convention every dense catalogue uses. Ignored
  // while typing somewhere else, so it never swallows a literal slash.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable) return;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      event.preventDefault();
      search.current?.focus();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="mb-3 flex flex-col gap-2 rounded-[16px] border border-hair bg-[linear-gradient(180deg,color-mix(in_oklab,var(--primary)_5%,var(--surface)),var(--surface))] p-2 shadow-[0_24px_60px_-54px_var(--primary)]">
      {searchable && (
        <div className="flex gap-2">
          <div className="flex h-[46px] flex-1 items-center gap-2.5 rounded-[12px] border border-hair-soft bg-bg px-4 transition-colors focus-within:border-primary">
            <span aria-hidden="true" className="text-[13px] text-muted">
              ⌕
            </span>
            <input
              ref={search}
              value={query}
              onChange={(event) => onQuery(event.target.value)}
              placeholder="Search firm, account size, platform…"
              aria-label="Search firms and challenges"
              className="h-full min-w-0 flex-1 border-0 bg-transparent text-[13px] outline-none placeholder:text-muted"
            />
            {query ? (
              <button
                type="button"
                onClick={() => onQuery("")}
                className="flex-none cursor-pointer rounded-[7px] border border-hair px-2 py-1 font-mono text-[8.5px] uppercase tracking-[0.12em] text-muted transition hover:border-primary hover:text-fg"
              >
                Clear
              </button>
            ) : (
              <kbd
                aria-hidden="true"
                className="hidden flex-none rounded-[6px] border border-hair px-1.5 py-0.5 font-mono text-[9px] text-muted md:block"
              >
                /
              </kbd>
            )}
          </div>
        </div>
      )}

      {selects.length > 0 && (
        /* One wrapping row, More included rather than pinned beside it. Pinned,
           it held its own column while the selects stacked underneath, so a
           phone got one select per line and the second row became four. In the
           flow they pair up: two lines at 375px, one at 1180. */
        <div className="flex flex-wrap gap-2">
          {selects.map((select) => (
            <FilterSelect
              key={select.label}
              label={select.label}
              value={select.value}
              options={select.options}
              onChange={select.onChange}
              /* `grow basis-*` rather than `flex-1`: the basis is what decides
                 where the row wraps, and `flex-1` resets it to 0 so four
                 controls would squeeze onto one 375px line instead of pairing
                 up. Set on the child, not as `[&>*]:` on the parent, which
                 outranks the More button's own `flex-none` and stretched it
                 into a fourth select. */
              className="grow basis-[132px]"
            />
          ))}

          <button
            type="button"
            onClick={onOpenMore}
            className="flex h-[46px] flex-none cursor-pointer items-center justify-center gap-2 rounded-[11px] border border-hair bg-surface px-4 font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted transition hover:border-primary hover:text-fg"
          >
            <span aria-hidden="true">☷</span>
            <span className="hidden md:inline">More</span>
            {moreCount > 0 && (
              <span className="grid size-[17px] place-items-center rounded-full bg-primary text-[8.5px] text-on-primary">
                {moreCount}
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
