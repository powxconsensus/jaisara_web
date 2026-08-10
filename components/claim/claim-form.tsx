"use client";

import { useId, useState } from "react";
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
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  badge?: Badge;
  /** Figures, dates, ids and codes are mono. */
  mono?: boolean;
  /** Span both columns. */
  full?: boolean;
  placeholder?: string;
}) {
  const id = useId();

  return (
    <Labelled id={id} label={label} badge={badge} full={full}>
      <input
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={cn(CONTROL, mono && "font-mono tabular-nums")}
      />
    </Labelled>
  );
}

export interface ClaimOption {
  value: string;
  label: string;
  /** Groups the list under an optgroup — the firm's own account type. */
  group?: string | null;
}

/**
 * A field whose answer is already known to the catalogue.
 *
 * Firms, plans and coupons are all things we hold rows for, so asking somebody
 * to type them is asking them to make a typo. A mistyped firm cannot be
 * matched; a mistyped coupon cannot be attributed at all.
 *
 * `allowOther` keeps the escape hatch. A member can buy something we have not
 * listed yet, and refusing the claim because our catalogue is behind would
 * punish them for our gap — picking "Not listed" reveals a text box and the
 * claim goes through with whatever they type.
 */
export function ClaimSelect({
  label,
  value,
  onChange,
  options,
  badge,
  full,
  placeholder = "Select…",
  allowOther,
  otherLabel = "Not listed — type it in",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ClaimOption[];
  badge?: Badge;
  full?: boolean;
  placeholder?: string;
  allowOther?: boolean;
  otherLabel?: string;
}) {
  const id = useId();
  const known = options.some((option) => option.value === value);
  // Anything the catalogue does not know is "other" — including a value the
  // receipt parser proposed, which is exactly when the text box should already
  // be showing with that value in it.
  const [manual, setManual] = useState(Boolean(value) && !known);

  const groups = [...new Set(options.map((option) => option.group ?? ""))];

  return (
    <Labelled id={id} label={label} badge={badge} full={full}>
      <select
        id={id}
        value={manual ? OTHER : value}
        onChange={(event) => {
          const next = event.target.value;
          setManual(next === OTHER);
          onChange(next === OTHER ? "" : next);
        }}
        className={cn(CONTROL, "cursor-pointer appearance-none pr-9", CARET)}
      >
        <option value="">{placeholder}</option>

        {groups.map((group) => {
          const rows = options.filter((option) => (option.group ?? "") === group);
          return group ? (
            <optgroup key={group} label={group}>
              {rows.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ) : (
            rows.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          );
        })}

        {allowOther && <option value={OTHER}>{otherLabel}</option>}
      </select>

      {manual && (
        <input
          value={value}
          autoFocus
          placeholder="Type it exactly as the receipt shows it"
          onChange={(event) => onChange(event.target.value)}
          className={cn(CONTROL, "mt-2")}
        />
      )}
    </Labelled>
  );
}

/**
 * The order date.
 *
 * A native date input rather than a typed string: `03/08/2026` is August in
 * one country and March in another, and the claim is matched against the
 * firm's own report. Capped at today because a receipt cannot be from the
 * future, and that is a typo worth catching before it reaches a reviewer.
 */
export function ClaimDate({
  label,
  value,
  onChange,
  badge,
  full,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  badge?: Badge;
  full?: boolean;
}) {
  const id = useId();

  return (
    <Labelled id={id} label={label} badge={badge} full={full}>
      <input
        id={id}
        type="date"
        value={value}
        max={new Date().toISOString().slice(0, 10)}
        onChange={(event) => onChange(event.target.value)}
        className={cn(CONTROL, "font-mono tabular-nums")}
      />
    </Labelled>
  );
}

type Badge = "AI" | "CHECK THIS";

/** Sentinel for the "not listed" row. Not a value anything can be called. */
const OTHER = "__other__";

const CONTROL =
  "w-full rounded-[10px] border border-hair bg-surface-2 px-3.5 py-3 text-sm outline-none transition focus:border-primary";

/** A chevron drawn in the border colour, since `appearance-none` removes it. */
const CARET =
  "bg-[right_0.9rem_center] bg-no-repeat bg-[length:10px] bg-[image:var(--caret)] [--caret:url('data:image/svg+xml;utf8,<svg_xmlns=\"http://www.w3.org/2000/svg\"_viewBox=\"0_0_10_6\"><path_d=\"M1_1l4_4_4-4\"_fill=\"none\"_stroke=\"%23888\"_stroke-width=\"1.5\"/></svg>')]";

/** The label and badge every control shares. */
function Labelled({
  id,
  label,
  badge,
  full,
  children,
}: {
  id: string;
  label: string;
  badge?: Badge;
  full?: boolean;
  children: React.ReactNode;
}) {
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
      {children}
    </div>
  );
}
