"use client";

import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The console's building blocks.
 *
 * Ten screens sharing one set of primitives is what keeps the admin side
 * looking like the rest of the site rather than a bootstrap dashboard bolted
 * onto it. Tone is always carried by a word as well as a colour.
 *
 * Sizes come from the `--ct-*` tokens on `.console-root` rather than from
 * literals, so density is one edit in `globals.css` instead of forty here.
 * Headings deliberately do not use the display face: a page somebody works in
 * for six hours does not want a 22px black uppercase title announcing where
 * they already know they are.
 */

export type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";

const TONE_VAR: Record<Tone, string> = {
  neutral: "var(--text-muted)",
  primary: "var(--primary)",
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  info: "var(--info)",
};

// ── Layout ───────────────────────────────────────────────────────────────────

export function Panel({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "rounded-[var(--ct-radius)] border border-[var(--console-hair)] bg-surface",
        className,
      )}
      {...props}
    />
  );
}

export function PanelHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="font-mono text-[length:var(--ct-label)] tracking-[0.18em] text-primary">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-1.5 text-[length:var(--ct-title)] font-semibold leading-tight tracking-[-0.01em]">
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 max-w-[74ch] text-[length:var(--ct-small)] leading-[1.5] text-muted">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-1.5">{actions}</div>}
    </div>
  );
}

/**
 * Page-level intro, one per console route.
 *
 * One row: title, eyebrow, actions. The description is optional and small, and
 * most screens should not need one - the section it sits in is already named
 * in the rail and the breadcrumb, so a paragraph explaining it is a paragraph
 * nobody reads twice.
 *
 * This has been cut twice. It began as an eyebrow, a 38px display heading and
 * a three-line paragraph - about 150px before any work appeared - then became
 * a 22px black uppercase title. Both were the marketing voice on a tool.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <div className="flex min-w-0 items-baseline gap-2">
          <h1 className="text-[length:var(--ct-title)] font-semibold leading-none tracking-[-0.01em]">
            {title}
          </h1>
          <span className="font-mono text-[length:var(--ct-label)] tracking-[0.18em] text-muted">
            {eyebrow}
          </span>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-1.5">{actions}</div>}
      </div>
      {description && (
        <p className="mt-1 text-[length:var(--ct-small)] leading-[1.45] text-muted">
          {description}
        </p>
      )}
    </div>
  );
}

// ── Figures ──────────────────────────────────────────────────────────────────

/**
 * A single live figure.
 *
 * The tone bleeds into a top rule rather than only the number, so a row of
 * tiles can be read at a glance for "is anything wrong" before any digit is
 * actually read. Neutral tiles get no rule at all - colouring everything
 * colours nothing.
 */
export function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: Tone;
}) {
  return (
    // `h-full` plus a column layout is what keeps a row of these the same
    // height: the hints are different lengths, so without it a two-line hint
    // made its tile taller than the rest and the row read as misaligned. The
    // rule always occupies 2px whether or not it is coloured, for the same
    // reason - a neutral tile must not sit 2px shorter than a warning one.
    <div className="flex h-full flex-col overflow-hidden rounded-[var(--ct-radius)] border border-[var(--console-hair)] bg-surface">
      <div
        aria-hidden
        className="h-[2px] flex-none"
        style={{ background: tone === "neutral" ? "transparent" : TONE_VAR[tone] }}
      />
      <div className="flex flex-1 flex-col p-3">
        <p className="font-mono text-[length:var(--ct-label)] tracking-[0.14em] text-muted">
          {label}
        </p>
        <p
          data-count
          data-num
          className="mt-1.5 font-mono text-[21px] leading-none tracking-[-0.02em]"
          style={{ color: tone === "neutral" ? undefined : TONE_VAR[tone] }}
        >
          {value}
        </p>
        {hint && (
          <p className="mt-1.5 text-[length:var(--ct-small)] leading-[1.4] text-muted">{hint}</p>
        )}
      </div>
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-[5px] px-1.5 py-[3px] font-mono text-[length:var(--ct-label)] font-medium uppercase leading-[1.35] tracking-[0.11em]",
        className,
      )}
      style={{
        background: `color-mix(in oklab, ${TONE_VAR[tone]} 15%, transparent)`,
        color: TONE_VAR[tone],
      }}
    >
      {children}
    </span>
  );
}

/** Key/value rows - the detail panel's workhorse. */
export function DefinitionList({
  rows,
}: {
  rows: { label: string; value: ReactNode; mono?: boolean }[];
}) {
  return (
    <dl className="flex flex-col">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-start justify-between gap-4 border-b border-hair-soft py-[var(--ct-row-y)] last:border-b-0"
        >
          <dt className="flex-none text-[length:var(--ct-small)] text-muted">{row.label}</dt>
          <dd
            data-num
            className={cn(
              "min-w-0 break-words text-right text-[length:var(--ct-body)]",
              row.mono && "font-mono text-[length:var(--ct-small)]",
            )}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// ── Tables ───────────────────────────────────────────────────────────────────

/**
 * A scrolling table with a header that stays put.
 *
 * The sticky header is the reason this exists rather than a bare `<table>`.
 * These lists run to a hundred rows, and a column head that scrolls away turns
 * the fifth column of an orders table into an unlabelled number - which, on
 * screens where some of those numbers are money, is worse than useless.
 */
export function TableShell({
  columns,
  children,
  minWidth = 860,
}: {
  columns: string[];
  children: ReactNode;
  minWidth?: number;
}) {
  return (
    <div className="console-scroll overflow-auto">
      <table className="w-full border-collapse text-left" style={{ minWidth }}>
        <thead className="sticky top-0 z-10 bg-surface">
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="whitespace-nowrap border-b border-[var(--console-hair)] bg-surface px-2.5 py-2 font-mono text-[length:var(--ct-label)] font-normal tracking-[0.13em] text-muted"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ className, ...props }: ComponentProps<"td">) {
  return (
    <td
      data-num
      className={cn("px-2.5 py-[var(--ct-row-y)] align-top text-[length:var(--ct-body)]", className)}
      {...props}
    />
  );
}

export function Tr({ className, ...props }: ComponentProps<"tr">) {
  return (
    <tr
      className={cn(
        "border-b border-hair-soft transition-colors last:border-b-0 hover:bg-surface-2/60",
        className,
      )}
      {...props}
    />
  );
}

// ── States ───────────────────────────────────────────────────────────────────

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="mb-2 font-mono text-[length:var(--ct-label)] tracking-[0.18em] text-muted">
        NOTHING HERE
      </p>
      <p className="mb-1.5 text-[length:var(--ct-body)] font-semibold">{title}</p>
      <p className="mx-auto max-w-[48ch] text-[length:var(--ct-small)] leading-[1.5] text-muted">
        {message}
      </p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="rounded-[8px] px-3 py-2 text-[length:var(--ct-small)] leading-[1.5] text-danger"
      style={{ background: "color-mix(in oklab, var(--danger) 10%, transparent)" }}
    >
      {children}
    </p>
  );
}

/** Neutral placeholder while a resource is in flight. */
export function LoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-hidden className="space-y-1.5 p-1.5">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-[38px] animate-pulse rounded-[8px] bg-surface-2" />
      ))}
    </div>
  );
}

// ── Controls ─────────────────────────────────────────────────────────────────

/**
 * Segmented control. Used wherever two editors would otherwise sit side by side
 * competing for the same width - the email studio's HTML and plain-text bodies
 * being the case that prompted it.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="inline-flex gap-0.5 rounded-[8px] border border-[var(--console-hair)] bg-surface-2 p-0.5"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "cursor-pointer whitespace-nowrap rounded-[6px] px-2.5 py-1.5 font-mono text-[length:var(--ct-label)] uppercase tracking-[0.12em] transition",
              active ? "bg-primary text-on-primary" : "text-muted hover:text-fg",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "w-full cursor-pointer rounded-[7px] border border-[var(--console-hair)] bg-surface-2 px-2.5 py-1.5 text-[length:var(--ct-body)] outline-none transition focus:border-primary",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "w-full rounded-[8px] border border-[var(--console-hair)] bg-surface-2 p-3 text-[length:var(--ct-body)] leading-[1.65] outline-none transition focus:border-primary",
        className,
      )}
      {...props}
    />
  );
}

/** A left-hand record list - claims, campaigns, posts all share this shape. */
export function RecordList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "console-scroll overflow-y-auto rounded-[var(--ct-radius)] border border-[var(--console-hair)] bg-surface p-1.5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function RecordButton({
  active,
  className,
  ...props
}: ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "mb-0.5 w-full cursor-pointer rounded-[7px] p-2 text-left text-[length:var(--ct-body)] transition last:mb-0",
        active ? "bg-surface-2 ring-1 ring-primary/40" : "hover:bg-surface-2",
        className,
      )}
      {...props}
    />
  );
}

export { TONE_VAR };
