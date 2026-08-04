"use client";

import { cn } from "@/lib/cn";

/**
 * Dot pager under the deck. The active dot stretches into a bar. Clicking a dot
 * jumps straight to that receipt, bypassing the hover-pause guard.
 */
export function Pager({
  count,
  activeIndex,
  onSelect,
}: {
  count: number;
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="absolute left-1/2 top-[calc(100%+16px)] flex -translate-x-1/2 items-center gap-1.5">
      {Array.from({ length: count }, (_, i) => {
        const active = i === activeIndex;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            aria-label={`Show receipt ${i + 1} of ${count}`}
            aria-current={active}
            /* The dot is small by design; the button keeps a 44px hit area. */
            className="grid h-11 cursor-pointer place-items-center px-1"
          >
            <span
              className={cn(
                "h-[5px] rounded-[3px] transition-[width,background] duration-[350ms] ease-[cubic-bezier(.2,.8,.2,1)]",
                active ? "w-[26px] bg-primary" : "w-[6px]",
              )}
              style={
                active
                  ? undefined
                  : { background: "color-mix(in oklab, var(--text) 22%, transparent)" }
              }
            />
          </button>
        );
      })}
    </div>
  );
}
