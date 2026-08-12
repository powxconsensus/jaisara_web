"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { type EstimatorFirm } from "@/lib/data/estimator";
import { FirmMark } from "@/components/ui/firm-mark";
import { cn } from "@/lib/cn";

/**
 * Searchable firm picker (handoff §5).
 *
 * Requirements met here: full-width option buttons with a 44px minimum row
 * (the whole row is clickable), the search input autofocused on open, arrow /
 * Enter / Escape navigation with `aria-activedescendant`, and an OPAQUE panel
 * background - a translucent blur let content behind it bleed through.
 */
export function FirmCombobox({
  value,
  onChange,
  firms,
}: {
  value: EstimatorFirm | null;
  onChange: (firm: EstimatorFirm) => void;
  firms: EstimatorFirm[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return firms;
    return firms.filter((firm) => firm.name.toLowerCase().includes(q));
  }, [query, firms]);

  // Autofocus the search when the panel opens.
  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  // Dismiss on outside interaction. `pointerdown` + contains() rather than a
  // blanket document click listener, which swallowed the next click anywhere
  // on the page and made every interaction take two clicks (handoff §6).
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const close = () => {
    setOpen(false);
    setQuery("");
    setHighlight(0);
  };

  const pick = (firm: EstimatorFirm) => {
    onChange(firm);
    close();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (results[highlight]) pick(results[highlight]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  };

  const optionId = (index: number) => `${listId}-option-${index}`;

  return (
    <div ref={wrapRef} className="relative mb-4 md:mb-6">
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-12 w-full cursor-pointer items-center gap-[11px] rounded-[11px] border bg-surface-2 px-[15px] py-[13px] transition hover:border-primary"
        style={{ borderColor: value ? "var(--primary)" : "var(--hair)" }}
      >
        <FirmMark
          name={value?.name ?? ""}
          mark={value?.mark ?? "??"}
          logoUrl={value?.logoUrl}
          size={26}
          className="rounded-lg"
        />
        <span
          className={cn("flex-1 text-left text-sm font-medium", !value && "text-muted")}
        >
          {value?.name ?? "Choose a prop firm"}
        </span>
        <span
          className="text-[9px] text-muted transition-transform duration-[250ms]"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
          aria-hidden="true"
        >
          ▼
        </span>
      </button>

      {open && (
        <div
          /* Opaque, not a translucent blur. */
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-[230] isolate rounded-[13px] border border-hair bg-surface p-2 shadow-card [animation:jsUp_.22s_both]"
          style={{ boxShadow: "0 10px 24px rgba(0,0,0,.28), var(--shadow)" }}
        >
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setHighlight(0);
            }}
            onKeyDown={onKeyDown}
            role="searchbox"
            aria-controls={listId}
            aria-activedescendant={results.length ? optionId(highlight) : undefined}
            placeholder="Search a firm - FTMO, Alpha, Maven…"
            className="mb-1.5 w-full rounded-[9px] border border-hair bg-surface-2 px-[13px] py-[11px] text-[13px] outline-none focus:border-primary"
          />

          <div
            id={listId}
            role="listbox"
            aria-label="Prop firms"
            className="flex max-h-56 flex-col gap-0.5 overflow-y-auto"
          >
            {results.map((firm, index) => (
              <button
                key={firm.slug}
                type="button"
                id={optionId(index)}
                role="option"
                aria-selected={index === highlight}
                onClick={() => pick(firm)}
                onMouseEnter={() => setHighlight(index)}
                className={cn(
                  "flex min-h-11 w-full cursor-pointer items-center gap-[11px] rounded-[9px] px-[11px] py-2.5 text-left transition-colors",
                  index === highlight && "bg-surface-2",
                )}
              >
                <FirmMark
                  name={firm.name}
                  mark={firm.mark}
                  logoUrl={firm.logoUrl}
                  size={26}
                  className="rounded-lg"
                />
                <span className="flex-1 text-[13.5px] font-medium">{firm.name}</span>
                <span className="font-mono text-[11.5px] tabular-nums text-primary">
                  {firm.cashbackPct}%
                </span>
              </button>
            ))}

            {results.length === 0 && (
              <p className="px-3 py-4 text-center text-[12.5px] text-muted">
                Not listed yet - ask support and we&rsquo;ll add it within a week.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
