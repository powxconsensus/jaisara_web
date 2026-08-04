"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

export interface ClaimFields {
  firm: string;
  plan: string;
  amount: string;
  date: string;
  order: string;
  coupon: string;
}

export const EMPTY_CLAIM: ClaimFields = {
  firm: "",
  plan: "",
  amount: "",
  date: "",
  order: "",
  coupon: "",
};

/** What the parser proposes from a sample receipt. */
export const PARSED_CLAIM: ClaimFields = {
  firm: "FTMO",
  plan: "$25K Swing",
  amount: "349.00",
  date: "2026-07-28",
  order: "FT-8842190",
  coupon: "JAISARA20",
};

/**
 * One claim field. Parsed fields carry an `AI` badge; low-confidence ones get
 * `CHECK THIS` in warning. Every field stays editable — the parser proposes,
 * the trader confirms (handoff §4.6).
 */
export function ClaimField({
  label,
  value,
  onChange,
  badge,
  mono,
  full,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  badge?: "AI" | "CHECK THIS";
  /** Figures, dates, ids and codes are mono. */
  mono?: boolean;
  /** Span both columns. */
  full?: boolean;
}) {
  const id = useId();
  const lowConfidence = badge === "CHECK THIS";

  return (
    <div className={full ? "md:col-span-2" : undefined}>
      <div className="mb-[7px] flex items-center gap-2">
        <label htmlFor={id} className="font-mono text-[9px] tracking-[0.14em] text-muted">
          {label}
        </label>
        {badge && (
          <span
            className="rounded px-[5px] py-0.5 font-mono text-[8px] tracking-[0.1em]"
            style={
              lowConfidence
                ? {
                    background: "color-mix(in oklab, var(--warning) 16%, transparent)",
                    color: "var(--warning)",
                  }
                : {
                    background: "color-mix(in oklab, var(--info) 15%, transparent)",
                    color: "var(--info)",
                  }
            }
          >
            {badge}
          </span>
        )}
      </div>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "w-full rounded-[10px] border border-hair bg-surface-2 px-3.5 py-3 text-sm outline-none transition focus:border-primary",
          mono && "font-mono tabular-nums",
        )}
      />
    </div>
  );
}
