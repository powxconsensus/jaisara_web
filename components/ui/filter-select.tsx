"use client";

import * as Popover from "@radix-ui/react-popover";
import { cn } from "@/lib/cn";

export interface SelectOption {
  value: string;
  label: string;
  /** How many results this option would leave. Omitted when not meaningful. */
  count?: number;
}

/**
 * A labelled dropdown for the deal finder.
 *
 * Built on Popover rather than a native `<select>` so the trigger can show its
 * label and its current value at once - a bare select reading "MT5" does not
 * say which of five filters it is, and a row of five of them is unreadable.
 *
 * Options carry their result counts, so a filter that would empty the page
 * says so before it is applied rather than after.
 */
export function FilterSelect({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  className?: string;
}) {
  const active = options.find((option) => option.value === value);
  // The first option is the neutral one ("Any platform"); anything else is a
  // choice somebody made, and the trigger should look like it.
  const chosen = options.length > 0 && value !== options[0]?.value;

  return (
    <Popover.Root>
      <Popover.Trigger
        className={cn(
          "flex h-[46px] min-w-0 cursor-pointer items-center justify-between gap-3 rounded-[11px] border bg-surface px-3.5 text-left transition-colors duration-[180ms]",
          // Radix returns focus to the trigger when the popover closes, so
          // every use of this control left the browser's default ring behind -
          // a hard white rectangle on a page with no other white in it, which
          // read as the select being stuck in some error state. Replaced, not
          // removed: a keyboard user still needs to see where they are.
          "outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-[color-mix(in_oklab,var(--primary)_28%,transparent)]",
          chosen ? "border-primary" : "border-hair hover:border-primary",
          className,
        )}
      >
        <span className="min-w-0">
          <span className="block font-mono text-[8px] uppercase tracking-[0.18em] text-muted">
            {label}
          </span>
          <span
            className={cn(
              "block truncate text-[12.5px] leading-[1.4]",
              chosen ? "text-primary" : "text-fg",
            )}
          >
            {active?.label ?? value}
          </span>
        </span>
        <span aria-hidden="true" className="flex-none text-[9px] text-muted">
          ▾
        </span>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-[400] max-h-[min(340px,60vh)] w-[var(--radix-popover-trigger-width)] min-w-[176px] overflow-y-auto rounded-[13px] border border-hair bg-surface-2 p-1.5 shadow-[0_30px_70px_-40px_rgba(0,0,0,0.8)]"
        >
          {options.map((option) => (
            <Popover.Close
              key={option.value}
              onClick={() => onChange(option.value)}
              className={cn(
                "flex w-full cursor-pointer items-center justify-between gap-3 rounded-[9px] px-3 py-2 text-left text-[12.5px] transition-colors duration-[140ms]",
                option.value === value
                  ? "bg-[color-mix(in_oklab,var(--primary)_15%,transparent)] text-primary"
                  : "text-muted hover:bg-surface hover:text-fg",
              )}
            >
              <span className="min-w-0 truncate">{option.label}</span>
              {option.count !== undefined && (
                <span className="flex-none font-mono text-[9.5px] tabular-nums text-muted">
                  {option.count}
                </span>
              )}
            </Popover.Close>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
